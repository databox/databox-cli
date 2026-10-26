import {randomUUID} from 'node:crypto'

const DEFAULT_BASE_URL = 'https://api.databox.com'

/** Every request is bounded: without this a stalled connection hangs a command forever. */
const DEFAULT_TIMEOUT_MS = 30_000

/** Ingest uploads a payload, so "slow" and "dead" need more room to be told apart. */
export const UPLOAD_TIMEOUT_MS = 300_000

/** `metric data` may sync the metric first, and the API gives that 150 s; this leaves its 504 room to arrive. */
export const METRIC_DATA_TIMEOUT_MS = 170_000

export interface ApiClientOptions {
  apiKey: string
  baseUrl?: string
  /** Receives the --verbose lines. It is only ever handed the output of describeRequest/describeResponse. */
  trace?: (line: string) => void
  /** The CLI's own version, sent in the User-Agent. Without it, fetch's default User-Agent goes out. */
  version?: string
}

export interface ApiError {
  code?: string
  field?: string
  message: string
  type?: string
}

export interface ApiErrorResponse {
  errors?: ApiError[]
  requestId?: string
  status?: string
}

interface ApiEnvelope<T> {
  data: T
  requestId: string
  status: string
}

/**
 * A request that reached the API and came back 4xx/5xx, or 2xx with a body that is not JSON.
 * `code`, `field` and `type` are the first entry of the envelope's `errors[]`; `errors` keeps them all.
 * `retryAfter` is the `Retry-After` header in seconds, when the response sent one as a number.
 */
export class ApiRequestError extends Error {
  readonly code?: string
  readonly field?: string
  /** Set by ApiClient from the response, so it is not a constructor parameter. */
  retryAfter?: number
  readonly type?: string

  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: ApiError[] = [],
    public readonly requestId?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = errors[0]?.code || undefined
    this.field = errors[0]?.field || undefined
    this.type = errors[0]?.type || undefined
  }
}

/**
 * A request that never got a response: connection refused, DNS failure, or timeout.
 * `requestId` is the x-request-id the CLI sent, so a request the API may still have processed can be traced.
 */
export class ApiConnectionError extends Error {
  constructor(message: string, public readonly requestId?: string) {
    super(message)
    this.name = 'ApiConnectionError'
  }
}

/**
 * The user-facing text of an API error, laid out as ingestion-api's cli.md §8 shows it.
 * The caller prefixes the first line with "Error: ".
 */
export function describeApiError(error: ApiRequestError): string {
  const lines = error.code ? [error.code] : []
  const details = error.errors.length > 0 ? error.errors : [{field: '', message: error.message}]

  for (const detail of details) {
    lines.push(error.code ? `  ${detail.message}` : detail.message)
    if (detail.field) lines.push(`  Field: ${detail.field}`)
  }

  if (error.retryAfter !== undefined) lines.push(`  Retry after ${error.retryAfter} s`)
  if (error.requestId) lines.push(`  Request ID: ${error.requestId}`)
  return lines.join('\n')
}

/**
 * The user-facing text of a transport failure. No response named a request ID, so the one shown
 * is the CLI's own; the API logs it too if the request got that far.
 */
export function describeConnectionError(error: ApiConnectionError): string {
  if (!error.requestId) return error.message
  return `${error.message}\n  Request ID: ${error.requestId} `
    + '(sent by the CLI; the request may still have reached the API, so quote this ID to support)'
}

/**
 * The --verbose request lines. Takes the method and URL only — never the headers — so the key is
 * not in scope here and cannot be printed. The header line is a literal for the same reason.
 */
export function describeRequest(method: string, url: string): string[] {
  return [`Request: ${method} ${url}`, 'Headers: x-api-key: <redacted>']
}

/** The --verbose response lines. */
export function describeResponse(status: number, durationMs: number, requestId?: string): string[] {
  const lines = [`Response: ${status} (${Math.round(durationMs)}ms)`]
  if (requestId) lines.push(`Request ID: ${requestId}`)
  return lines
}

const NO_HTTP_SCHEME = 'does not start with http:// or https://'

/**
 * A value as the API base URL: the canonical base (no trailing slash) when it is one, else what is
 * wrong with it. Anything but an absolute http(s) URL fails only once a request is built:
 * `api.databox.com` as a bare "TypeError: Invalid URL", and `localhost:8080`, which parses with the
 * scheme "localhost:", as a connection error that blames the network for a request that never left.
 * Surrounding whitespace is dropped here, once, for the check and the requests alike.
 *
 * The problem is worded so it never repeats the value, which may be a key pasted into the wrong
 * flag or a URL carrying credentials: of the URL it names only the scheme, and only one written
 * out as `scheme://`, since in `localhost:8080` the "scheme" is a host.
 */
function parseApiUrl(value: string): {problem: string} | {url: string} {
  const trimmed = value.trim()
  const hasScheme = /^[a-z][\d+.a-z-]*:\/\//i.test(trimmed)

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return {problem: hasScheme ? 'is not a valid URL' : NO_HTTP_SCHEME}
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return {problem: hasScheme ? `uses the scheme ${url.protocol}, not http: or https:` : NO_HTTP_SCHEME}
  }

  // Each would be sent on every request, or dropped from it in a way the user did not ask for.
  if (url.username || url.password) return {problem: 'contains a username or password'}
  if (url.search) return {problem: 'has a query string'}
  if (url.hash) return {problem: 'has a fragment'}

  return {url: `${url.origin}${url.pathname.replace(/\/+$/, '')}`}
}

/** The canonical API base URL for a value — trimmed, without a trailing slash — or undefined when it is not a usable base URL (see parseApiUrl). */
export function normalizeApiUrl(value: string): string | undefined {
  const parsed = parseApiUrl(value)
  return 'url' in parsed ? parsed.url : undefined
}

/** Whether a value can be the API base URL: absolute, over http or https, with no credentials, query or fragment. */
export function isApiUrl(value: string): boolean {
  return normalizeApiUrl(value) !== undefined
}

function apiUrlProblem(value: string): string {
  const parsed = parseApiUrl(value)
  return 'problem' in parsed ? parsed.problem : 'is not a usable API URL'
}

/** The exit-2 message for an --api-url (or DATABOX_API_URL) that normalizeApiUrl() refuses. It never includes the value. */
export function describeInvalidApiUrl(value: string): string {
  return `--api-url must be an http:// or https:// base URL with no username, password, query string or fragment, e.g. ${DEFAULT_BASE_URL}. `
    + `The value given (from --api-url or DATABOX_API_URL) ${apiUrlProblem(value)}.`
}

/**
 * The exit-1 message for a stored apiUrl that normalizeApiUrl() refuses, or that is not a string at all.
 * It names the config file, never the value.
 */
export function describeInvalidStoredApiUrl(value: unknown, configPath: string): string {
  const problem = typeof value === 'string' ? apiUrlProblem(value) : 'is not a string'
  return `The API URL saved in ${configPath} ${problem}. `
    + `Run "databox auth login --api-url ${DEFAULT_BASE_URL}" to replace it.`
}

/** Whether fetch() rejected because of `redirect: 'error'`: Node reports it as a TypeError caused by "unexpected redirect". */
export function isRedirectRefusal(error: unknown): boolean {
  return error instanceof TypeError && error.cause instanceof Error && error.cause.message === 'unexpected redirect'
}

/** A transport failure — before or during the response — as the exit-2 error the CLI reports. */
function connectionError(error: unknown, timeoutMs: number, message: string, requestId: string): ApiConnectionError {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new ApiConnectionError(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`, requestId)
  }

  if (isRedirectRefusal(error)) {
    return new ApiConnectionError('The API answered with a redirect, which the CLI does not follow (it would resend your API key). '
      + 'Check --api-url / DATABOX_API_URL (for example http:// where the API expects https://).', requestId)
  }

  return new ApiConnectionError(message, requestId)
}

export class ApiClient {
  readonly apiKey: string
  private baseUrl: string
  private trace?: (line: string) => void
  private userAgent?: string

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey
    // Callers check the URL first, with a message for the user; reaching this is a bug, and the
    // value is left out of the error as it may be a misplaced key.
    const baseUrl = normalizeApiUrl(options.baseUrl ?? DEFAULT_BASE_URL)
    if (baseUrl === undefined) throw new TypeError('The API base URL is not an http(s) URL; check it with normalizeApiUrl() first.')
    this.baseUrl = baseUrl
    this.trace = options.trace
    if (options.version) this.userAgent = `databox-cli/${options.version} (node ${process.version}; ${process.platform})`
  }

  async delete<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {method: 'DELETE'}, headers)
  }

  async get<T>(path: string, query?: Record<string, number | string | undefined>, headers?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, query)
    return this.request<T>(url, {method: 'GET'}, headers)
  }

  async patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      method: 'PATCH',
    }, headers)
  }

  async post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: {query?: Record<string, number | string | undefined>; timeoutMs?: number},
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query)
    return this.request<T>(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      method: 'POST',
    }, headers, options?.timeoutMs)
  }

  async put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      method: 'PUT',
    }, headers)
  }

  private buildUrl(path: string, query?: Record<string, number | string | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    return url.toString()
  }

  private emit(lines: string[]): void {
    if (!this.trace) return
    for (const line of lines) this.trace(line)
  }

  private async request<T>(
    url: string,
    init: RequestInit,
    extraHeaders?: Record<string, string>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    // One ID per request, so each page of a paginated list is traceable on its own.
    const sentRequestId = randomUUID()

    // extraHeaders is spread first so a caller cannot overwrite the API key or the request ID.
    const headers: Record<string, string> = {
      ...extraHeaders,
      Accept: 'application/json',
      'x-api-key': this.apiKey,
      'x-request-id': sentRequestId,
    }

    if (this.userAgent) {
      headers['User-Agent'] = this.userAgent
    }

    if (init.body) {
      headers['Content-Type'] = 'application/json'
    }

    this.emit(describeRequest(init.method ?? 'GET', url))
    const started = performance.now()

    // A followed redirect would re-send x-api-key to wherever it points: fetch strips only
    // Authorization and Cookie across origins. Refused, it rejects like any transport failure.
    let response: Response
    try {
      response = await fetch(url, {
        ...init, headers, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw connectionError(error, timeoutMs, 'Could not connect to API. Check your internet connection.', sentRequestId)
    }

    const durationMs = performance.now() - started

    // The body's requestId is the API's own word; a proxy's bare 413 or 502 has only the header;
    // a response with neither is reported by the ID the CLI sent.
    const headerRequestId = response.headers.get('x-request-id') || undefined
    const reportedRequestId = (bodyRequestId?: string): string => bodyRequestId || headerRequestId || sentRequestId

    // The body streams after the headers, under the same timeout signal, so reading it can
    // fail the same ways fetch() can: a timeout, an abort, or the socket closing ("terminated").
    let text: string
    try {
      text = await response.text()
    } catch (error) {
      throw connectionError(error, timeoutMs, 'The connection to the API was lost while reading its response.', reportedRequestId())
    }

    if (!response.ok) {
      let errorBody: ApiErrorResponse | null = null
      try {
        errorBody = JSON.parse(text) as ApiErrorResponse | null
      } catch {
        // Not JSON — a proxy's HTML page, say. Fall back to the HTTP status below.
      }

      const errors = Array.isArray(errorBody?.errors) ? errorBody.errors : []
      const requestId = reportedRequestId(errorBody?.requestId)
      this.emit(describeResponse(response.status, durationMs, requestId))

      const message = errors.length > 0
        ? errors.map(e => e.message).join('; ')
        : `API error: ${response.status} ${response.statusText}`

      const error = new ApiRequestError(message, response.status, errors, requestId)
      // Only the delay-seconds form: the HTTP-date form is not what the API sends.
      const retryAfter = response.headers.get('retry-after')?.trim()
      if (retryAfter && /^\d+$/.test(retryAfter)) error.retryAfter = Number(retryAfter)
      throw error
    }

    // 204 and other empty 2xx bodies would make JSON.parse throw.
    if (text.trim() === '') {
      this.emit(describeResponse(response.status, durationMs, reportedRequestId()))
      return undefined as T
    }

    // A 2xx that is not JSON did not come from the API: an HTML page behind a wrong base URL, say.
    let json: ApiEnvelope<T>
    try {
      json = JSON.parse(text) as ApiEnvelope<T>
    } catch {
      this.emit(describeResponse(response.status, durationMs, reportedRequestId()))
      throw new ApiRequestError(
        `The API response was not JSON (${response.status} ${response.statusText}).`, response.status, [], reportedRequestId(),
      )
    }

    this.emit(describeResponse(response.status, durationMs, reportedRequestId(json.requestId)))
    return json.data
  }
}
