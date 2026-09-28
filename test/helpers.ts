import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/** os.homedir() reads HOME on POSIX and USERPROFILE on win32, so both are redirected. */
const HOME_VARIABLES = ['HOME', 'USERPROFILE'] as const

/** The values before the first redirect; a variable that was unset is saved as undefined. */
let originalHome: Record<string, string | undefined> | undefined
let tempHome: string | undefined

function redirectHome(): string {
  originalHome ??= Object.fromEntries(HOME_VARIABLES.map(name => [name, process.env[name]]))
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'databox-cli-test-home-'))
  for (const name of HOME_VARIABLES) process.env[name] = tempHome
  return tempHome
}

/**
 * Points the CLI at a throwaway HOME and writes a config there.
 *
 * This used to read and overwrite the developer's real
 * ~/.config/databox-cli/config.json, so an interrupted run could destroy their
 * credentials. src/lib/config.ts resolves the path per call, so overriding HOME
 * and USERPROFILE is enough to redirect it.
 */
export function setupTestConfig(apiKey = 'test-api-key'): void {
  const dir = path.join(redirectHome(), '.config', 'databox-cli')
  fs.mkdirSync(dir, {recursive: true})
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({apiKey}))
}

/** A throwaway HOME with no config at all — for the unauthenticated paths. */
export function setupEmptyConfig(): void {
  redirectHome()
}

export function cleanupTestConfig(): void {
  if (originalHome !== undefined) {
    for (const name of HOME_VARIABLES) {
      // Assigning undefined would store the string "undefined", so an unset variable is deleted.
      if (originalHome[name] === undefined) delete process.env[name]
      else process.env[name] = originalHome[name]
    }
  }

  if (tempHome) {
    fs.rmSync(tempHome, {force: true, recursive: true})
    tempHome = undefined
  }

  originalHome = undefined
}

type MockRoute = {
  body?: Record<string, unknown>
  method: string
  path: string
  response: unknown
  /** When set, the route only answers this exact query string (e.g. '?page=1&pageSize=100'). */
  search?: string
  status?: number
}

export type CapturedRequest = {
  body: unknown
  headers: Record<string, string>
  method: string
  path: string
  search: string
}

let mockRoutes: MockRoute[] = []
let capturedRequests: CapturedRequest[] = []
let originalFetch: typeof global.fetch

/**
 * Requests the CLI actually sent, in order. Use this to assert on request bodies —
 * a command that sends a field name the API does not accept is otherwise invisible
 * here, since the mock replies the same either way.
 */
export function requests(): CapturedRequest[] {
  return capturedRequests
}

/** The body of the last request matching a method and path. */
export function lastBody<T = Record<string, unknown>>(method: string, path: string): T | undefined {
  for (let i = capturedRequests.length - 1; i >= 0; i--) {
    const request = capturedRequests[i]
    if (request.method === method && request.path === path) {
      return request.body as T
    }
  }

  return undefined
}

export function mockApi(routes: MockRoute[]): void {
  mockRoutes = routes
  capturedRequests = []
  originalFetch = global.fetch
  global.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'
    const parsed = new URL(url)

    let body: unknown
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }

    capturedRequests.push({
      body, headers: {...init?.headers as Record<string, string>}, method, path: parsed.pathname, search: parsed.search,
    })

    const route = mockRoutes.find(r => r.method === method && parsed.pathname === r.path
      && (r.search === undefined || r.search === parsed.search))

    if (!route) {
      return new Response(JSON.stringify({errors: [{message: `No mock for ${method} ${url}`}]}), {
        headers: {'Content-Type': 'application/json'},
        status: 404,
      })
    }

    return new Response(JSON.stringify(route.response), {
      headers: {'Content-Type': 'application/json'},
      status: route.status ?? 200,
    })
  }) as typeof global.fetch
}

export function restoreApi(): void {
  if (originalFetch) {
    global.fetch = originalFetch
  }

  mockRoutes = []
  capturedRequests = []
}

function defineOnStdin(key: string, value: unknown): void {
  Object.defineProperty(process.stdin, key, {configurable: true, value, writable: true})
}

/**
 * Makes process.stdin a pipe that carries `content` and then ends: not a TTY, and the content
 * arrives once something starts reading. The real stdin is never read. Returns the undo.
 */
export function pipeStdin(content: string): () => void {
  const keys = ['isTTY', 'pause', 'resume', 'setEncoding']
  const saved = keys.map(key => ({descriptor: Object.getOwnPropertyDescriptor(process.stdin, key), key}))
  let fed = false
  defineOnStdin('isTTY', false)
  defineOnStdin('pause', () => process.stdin)
  defineOnStdin('setEncoding', () => process.stdin)
  defineOnStdin('resume', () => {
    if (!fed) {
      fed = true
      setImmediate(() => {
        if (content) process.stdin.emit('data', content)
        process.stdin.emit('end')
      })
    }

    return process.stdin
  })

  return () => {
    for (const {descriptor, key} of saved) {
      if (descriptor) Object.defineProperty(process.stdin, key, descriptor)
      else delete (process.stdin as unknown as Record<string, unknown>)[key]
    }
  }
}
