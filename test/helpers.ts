import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'databox-cli')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

let originalConfig: string | null = null

export function setupTestConfig(apiKey = 'test-api-key'): void {
  if (fs.existsSync(CONFIG_FILE)) {
    originalConfig = fs.readFileSync(CONFIG_FILE, 'utf-8')
  }

  fs.mkdirSync(CONFIG_DIR, {recursive: true})
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({apiKey}))
}

export function cleanupTestConfig(): void {
  if (originalConfig !== null) {
    fs.writeFileSync(CONFIG_FILE, originalConfig)
    originalConfig = null
  } else if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE)
  }
}

type MockRoute = {
  body?: Record<string, unknown>
  method: string
  path: string
  response: unknown
  status?: number
}

let mockRoutes: MockRoute[] = []
let originalFetch: typeof global.fetch

export function mockApi(routes: MockRoute[]): void {
  mockRoutes = routes
  originalFetch = global.fetch
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'

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
}
