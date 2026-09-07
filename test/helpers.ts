import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

let originalHome: string | undefined
let tempHome: string | undefined

/**
 * Points the CLI at a throwaway HOME and writes a config there.
 *
 * This used to read and overwrite the developer's real
 * ~/.config/databox-cli/config.json, so an interrupted run could destroy their
 * credentials. src/lib/config.ts resolves the path per call, so overriding HOME
 * is enough to redirect it.
 */
export function setupTestConfig(apiKey = 'test-api-key'): void {
  originalHome = process.env.HOME
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'databox-cli-test-home-'))
  process.env.HOME = tempHome

  const dir = path.join(tempHome, '.config', 'databox-cli')
  fs.mkdirSync(dir, {recursive: true})
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({apiKey}))
}

/** A throwaway HOME with no config at all — for the unauthenticated paths. */
export function setupEmptyConfig(): void {
  originalHome ??= process.env.HOME
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'databox-cli-test-home-'))
  process.env.HOME = tempHome
}

export function cleanupTestConfig(): void {
  if (originalHome !== undefined) {
    process.env.HOME = originalHome
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
  status?: number
}

export type CapturedRequest = {
  body: unknown
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
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
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

    capturedRequests.push({body, method, path: parsed.pathname, search: parsed.search})

    const route = mockRoutes.find((r) => {
      const urlPath = new URL(url).pathname
      return r.method === method && urlPath === r.path
    })

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
