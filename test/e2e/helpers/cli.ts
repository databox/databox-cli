import {spawn} from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

import {getConfig} from './env.js'

const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HELPERS_DIR, '..', '..', '..')

/** The built entrypoint — the artifact users actually install, not ts-node. */
export const CLI_ENTRYPOINT = path.join(REPO_ROOT, 'bin', 'run.js')

export const DEFAULT_TIMEOUT_MS = 60_000

export interface CliResult {
  argv: string[]
  code: number
  stderr: string
  stdout: string
  timedOut: boolean
}

export interface CliOptions {
  /** Extra child env. Applied last; an explicit `undefined` unsets a variable. */
  env?: Record<string, string | undefined>
  /** Piped to the child's stdin. When omitted, stdin is 'ignore'. */
  stdin?: string
  timeoutMs?: number
  /** Run with no credentials at all — for the unauthenticated exit-1 cases. */
  withoutCredentials?: boolean
}

let scratchHome: string | undefined

/**
 * An empty HOME for every child, so the CLI's config file
 * (~/.config/databox-cli/config.json) can neither influence a run nor be
 * touched by one. The unit suite in test/helpers.ts overwrites the developer's
 * real config; the e2e layer must not.
 */
function isolatedHome(): string {
  scratchHome ||= fs.mkdtempSync(path.join(os.tmpdir(), 'databox-cli-e2e-home-'))
  return scratchHome
}

function buildChildEnv(options: CliOptions): NodeJS.ProcessEnv {
  const {accountId, allowInsecureTls, environment} = getConfig()

  // Start from a scrubbed copy — an exported DATABOX_API_KEY on the developer's
  // machine must never leak into a run and silently change the target.
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('DATABOX_')) env[key] = value
  }

  env.HOME = isolatedHome()
  if (allowInsecureTls) env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  // Always pin the URL, even without credentials: ApiClient defaults to
  // https://api.databox.com, so an unset URL means "production".
  env.DATABOX_API_URL = environment.baseUrl

  if (!options.withoutCredentials) {
    env.DATABOX_API_KEY = environment.apiKey
    if (accountId) env.DATABOX_ACCOUNT_ID = accountId
  }

  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete env[key]
    } else {
      env[key] = value
    }
  }

  return env
}

/** Spawns the built CLI and captures its exit code and streams. Never throws on a non-zero exit. */
export function cli(argv: string[], options: CliOptions = {}): Promise<CliResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_ENTRYPOINT, ...argv], {
      cwd: REPO_ROOT,
      env: buildChildEnv(options),
      stdio: [options.stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    const settle = (code: number) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(killTimer)
      resolve({argv, code, stderr, stdout, timedOut})
    }

    // Fires well before the mocha timeout so a hang reports as a failed assertion
    // naming the command, not as an opaque suite timeout. The promise settles on
    // the kill timer whether or not the child ever emits 'close' — otherwise an
    // unkillable child would hang the whole run.
    let killTimer: NodeJS.Timeout
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      killTimer = setTimeout(() => {
        child.kill('SIGKILL')
        settle(-1)
      }, 5000)
    }, timeoutMs)

    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(killTimer)
      reject(error)
    })

    child.on('close', (code) => {
      settle(code ?? -1)
    })

    if (options.stdin !== undefined) {
      child.stdin?.end(options.stdin)
    }
  })
}

/** Replaces the live API key anywhere it might surface in a failure message. */
export function redact(text: string): string {
  const {apiKey} = getConfig().environment
  if (!apiKey) return text
  return text.split(apiKey).join('pak_<redacted>')
}

/** A failure message you can act on: the exact command, its code, and both streams. */
export function describeResult(result: CliResult): string {
  const lines = [
    `command : databox ${result.argv.join(' ')}`,
    `exit    : ${result.code}${result.timedOut ? ' (timed out)' : ''}`,
  ]
  if (result.stdout.trim()) lines.push(`stdout  :\n${result.stdout.trim()}`)
  if (result.stderr.trim()) lines.push(`stderr  :\n${result.stderr.trim()}`)
  return redact(lines.join('\n'))
}

export function expectOk(result: CliResult): CliResult {
  if (result.code !== 0) {
    throw new Error(`Expected exit 0.\n${describeResult(result)}`)
  }

  return result
}

/** Exit codes are part of the CLI's contract: 1 = general/auth/API, 2 = input validation. */
export function expectExit(result: CliResult, code: number): CliResult {
  if (result.code !== code) {
    throw new Error(`Expected exit ${code}.\n${describeResult(result)}`)
  }

  return result
}

/** Asserts the run succeeded and that stdout is nothing but parseable JSON. */
export function json<T = unknown>(result: CliResult): T {
  expectOk(result)

  try {
    return JSON.parse(result.stdout) as T
  } catch {
    throw new Error(`Expected stdout to be JSON.\n${describeResult(result)}`)
  }
}

export function expectField(
  object: unknown,
  field: string,
  expectedType?: 'boolean' | 'number' | 'object' | 'string',
): void {
  if (typeof object !== 'object' || object === null) {
    throw new TypeError(`Expected an object to read "${field}" from, got ${typeof object}`)
  }

  const value = (object as Record<string, unknown>)[field]
  if (value === undefined || value === null) {
    throw new Error(`Missing required field "${field}" in ${redact(JSON.stringify(object))}`)
  }

  if (expectedType && typeof value !== expectedType) {
    throw new TypeError(`Field "${field}" expected type "${expectedType}", got "${typeof value}"`)
  }
}

/** Asserts a field exists, allowing null — for fields the API may legitimately not populate. */
export function expectKey(object: unknown, field: string): void {
  if (typeof object !== 'object' || object === null) {
    throw new TypeError(`Expected an object to read "${field}" from, got ${typeof object}`)
  }

  if (!Object.hasOwn(object, field)) {
    throw new Error(`Missing key "${field}" in ${redact(JSON.stringify(object))}`)
  }
}

/**
 * Errors the API raises when one of its own downstream services is unhealthy —
 * as opposed to the CLI sending something wrong. A suite that hits one of these
 * should skip with a reason, not fail: a broken environment is not a CLI defect.
 */
const SERVICE_OUTAGE_PATTERNS = [
  /upstream service error/i,
  /problem with one of our services/i,
  /please try (again )?later/i,
]

/**
 * The CLI hard-wraps error output, so a message can be split across lines with
 * padding. Always match against this, never the raw stream.
 */
export function errorText(result: CliResult): string {
  return redact(`${result.stderr} ${result.stdout}`).replaceAll(/\s+/g, ' ').trim()
}

/** Returns a skip reason when the failure is the environment's, otherwise undefined. */
export function serviceUnavailable(result: CliResult): string | undefined {
  if (result.code === 0) return undefined

  const message = errorText(result)
  if (!SERVICE_OUTAGE_PATTERNS.some((pattern) => pattern.test(message))) return undefined

  return `API reported a service-side failure for "databox ${result.argv.join(' ')}": ${message}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Shared dev environments fail in bursts — a run of requests 5xxs or is spuriously
 * rejected as unauthenticated, then recovers. Only fixture setup retries on these;
 * assertions never do, or a genuine failure could be retried into a pass.
 */
const TRANSIENT_PATTERNS = [...SERVICE_OUTAGE_PATTERNS, /authentication required/i, /internal_error/i]

function isTransient(result: CliResult): boolean {
  if (result.code === 0) return false
  if (result.timedOut) return true
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(errorText(result)))
}

/**
 * Runs a command, retrying only failures whose output matches a transient
 * environment fault. Safe for assertions as well as fixtures: a genuine failure
 * does not match, and even a matched one is returned as-is once attempts run out,
 * so nothing is ever retried into a pass.
 *
 * The one caveat is creates: one that succeeds server-side but reports a 5xx gets
 * retried and leaves an orphan, which is what the `cli-e2e-` sweeper is for.
 */
export async function cliWithRetry(
  argv: string[],
  {attempts = 3, delayMs = 3000, ...options}: CliOptions & {attempts?: number; delayMs?: number} = {},
): Promise<CliResult> {
  let result = await cli(argv, options)

  for (let attempt = 1; attempt < attempts && isTransient(result); attempt++) {
    console.log(`   retrying "databox ${argv.join(' ')}" after a transient failure (${attempt}/${attempts - 1})`)
    // eslint-disable-next-line no-await-in-loop
    await sleep(delayMs)
    // eslint-disable-next-line no-await-in-loop
    result = await cli(argv, options)
  }

  return result
}

/**
 * Retries a read-only call past transient upstream failures. Never use this for
 * anything that creates a resource — it would create several.
 */
export async function retryRead<T>(
  fn: () => Promise<T>,
  {attempts = 3, delayMs = 2000}: {attempts?: number; delayMs?: number} = {},
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs)
      }
    }
  }

  throw lastError
}
