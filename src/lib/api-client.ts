const DEFAULT_BASE_URL = 'https://api.databox.com'

export interface ApiClientOptions {
  apiKey: string
  baseUrl?: string
}

export interface ApiError {
  code?: string
  message: string
  field?: string
  type?: string
}

export interface ApiErrorResponse {
  requestId?: string
  status?: string
  errors?: ApiError[]
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors: ApiError[] = [],
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export class ApiClient {
  private apiKey: string
  private baseUrl: string

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  }

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, query)
    return this.request<T>(url, {method: 'GET'})
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      body: body ? JSON.stringify(body) : undefined,
      method: 'POST',
    })
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {method: 'DELETE'})
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
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

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
    }

    if (init.body) {
      headers['Content-Type'] = 'application/json'
    }

    let response: Response
    try {
      response = await fetch(url, {...init, headers})
    } catch {
      throw new Error('Could not connect to API. Check your internet connection.')
    }

    if (!response.ok) {
      let errors: ApiError[] = []
      try {
        const errorBody = (await response.json()) as ApiErrorResponse
        errors = errorBody.errors ?? []
      } catch {
        // ignore parse errors
      }

      const message = errors.length > 0
        ? errors.map((e) => e.message).join('; ')
        : `API error: ${response.status} ${response.statusText}`

      throw new ApiRequestError(message, response.status, errors)
    }

    return (await response.json()) as T
  }
}
