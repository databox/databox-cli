const DEFAULT_BASE_URL = 'https://api.databox.com'

/** Every request is bounded: without this a stalled connection hangs a command forever. */
const DEFAULT_TIMEOUT_MS = 30_000

/** Ingest uploads a payload, so "slow" and "dead" need more room to be told apart. */
export const UPLOAD_TIMEOUT_MS = 300_000

export interface ApiClientOptions {
  apiKey: string
  baseUrl?: string
  /** Receives the --verbose lines. It is only ever handed the output of describeRequest/describeResponse. */
  trace?: (line: string) => void
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
 */
export class ApiRequestError extends Error {
  readonly code?: string
  readonly field?: string
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

/** A request that never got a response: connection refused, DNS failure, or timeout. */
export class ApiConnectionError extends Error {
  constructor(message: string) {
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

  if (error.requestId) lines.push(`  Request ID: ${error.requestId}`)
  return lines.join('\n')
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

/** Whether fetch() rejected because of `redirect: 'error'`: Node reports it as a TypeError caused by "unexpected redirect". */
export function isRedirectRefusal(error: unknown): boolean {
  return error instanceof TypeError && error.cause instanceof Error && error.cause.message === 'unexpected redirect'
}

/** A transport failure — before or during the response — as the exit-2 error the CLI reports. */
function connectionError(error: unknown, timeoutMs: number, message: string): ApiConnectionError {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new ApiConnectionError(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`)
  }

  if (isRedirectRefusal(error)) {
    return new ApiConnectionError('The API answered with a redirect, which the CLI does not follow (it would resend your API key). '
      + 'Check --api-url / DATABOX_API_URL (for example http:// where the API expects https://).')
  }

  return new ApiConnectionError(message)
}

export class ApiClient {
  readonly apiKey: string
  private baseUrl: string
  private trace?: (line: string) => void

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.trace = options.trace
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
    // extraHeaders is spread first so a caller cannot overwrite the API key.
    const headers: Record<string, string> = {
      ...extraHeaders,
      Accept: 'application/json',
      'x-api-key': this.apiKey,
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
      throw connectionError(error, timeoutMs, 'Could not connect to API. Check your internet connection.')
    }

    const durationMs = performance.now() - started

    // The body streams after the headers, under the same timeout signal, so reading it can
    // fail the same ways fetch() can: a timeout, an abort, or the socket closing ("terminated").
    let text: string
    try {
      text = await response.text()
    } catch (error) {
      throw connectionError(error, timeoutMs, 'The connection to the API was lost while reading its response.')
    }

    if (!response.ok) {
      let errorBody: ApiErrorResponse | null = null
      try {
        errorBody = JSON.parse(text) as ApiErrorResponse | null
      } catch {
        // Not JSON — a proxy's HTML page, say. Fall back to the HTTP status below.
      }

      const errors = Array.isArray(errorBody?.errors) ? errorBody.errors : []
      const requestId = errorBody?.requestId || undefined
      this.emit(describeResponse(response.status, durationMs, requestId))

      const message = errors.length > 0
        ? errors.map(e => e.message).join('; ')
        : `API error: ${response.status} ${response.statusText}`

      throw new ApiRequestError(message, response.status, errors, requestId)
    }

    // 204 and other empty 2xx bodies would make JSON.parse throw.
    if (text.trim() === '') {
      this.emit(describeResponse(response.status, durationMs))
      return undefined as T
    }

    // A 2xx that is not JSON did not come from the API: an HTML page behind a wrong base URL, say.
    let json: ApiEnvelope<T>
    try {
      json = JSON.parse(text) as ApiEnvelope<T>
    } catch {
      this.emit(describeResponse(response.status, durationMs))
      throw new ApiRequestError(`The API response was not JSON (${response.status} ${response.statusText}).`, response.status)
    }

    this.emit(describeResponse(response.status, durationMs, json.requestId))
    return json.data
  }
}
