import {expect} from 'chai'

import {
  ApiClient, ApiConnectionError, ApiRequestError, describeApiError, describeConnectionError, describeInvalidApiUrl,
  describeInvalidStoredApiUrl, isApiUrl, normalizeApiUrl,
} from '../../src/lib/api-client.js'
import {mockApi, requests, restoreApi} from '../helpers.js'

const KEY = 'pak_secret-key-under-test'

function errorEnvelope(errors: unknown[], requestId = 'req-123'): unknown {
  return {errors, requestId, status: 'error'}
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }

  throw new Error('Expected the request to fail')
}

describe('ApiClient errors', () => {
  afterEach(() => {
    restoreApi()
  })

  it('keeps status, code, field, type and requestId from the error envelope', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/1',
      response: errorEnvelope([{
        code: 'invalid_input', field: 'name', message: 'Name is required.', type: 'validation',
      }]),
      status: 400,
    }])

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets/1'))

    expect(error).to.be.instanceOf(ApiRequestError)
    const apiError = error as ApiRequestError
    expect(apiError.status).to.equal(400)
    expect(apiError.code).to.equal('invalid_input')
    expect(apiError.field).to.equal('name')
    expect(apiError.type).to.equal('validation')
    expect(apiError.requestId).to.equal('req-123')
    expect(apiError.message).to.equal('Name is required.')
  })

  it('falls back to the HTTP status when the body carries no errors', async () => {
    mockApi([{
      method: 'GET', path: '/v2/datasets/1', response: {}, status: 502,
    }])

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets/1')) as ApiRequestError

    expect(error.status).to.equal(502)
    expect(error.code).to.equal(undefined)
    expect(error.message).to.contain('API error: 502')
  })

  it('keeps a Retry-After given in seconds, and ignores the HTTP-date form', async () => {
    const limited = errorEnvelope([{code: 'rate_limited', message: 'Rate limit exceeded.', type: 'request'}])
    mockApi([
      {
        headers: {'Retry-After': '12'}, method: 'GET', path: '/v2/a', response: limited, status: 429,
      },
      {
        headers: {'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT'}, method: 'GET', path: '/v2/b', response: limited, status: 429,
      },
    ])

    const client = new ApiClient({apiKey: KEY})
    const inSeconds = await caught(client.get('/v2/a')) as ApiRequestError
    const asDate = await caught(client.get('/v2/b')) as ApiRequestError

    expect(inSeconds.retryAfter).to.equal(12)
    expect(asDate.retryAfter).to.equal(undefined)
  })

  it('throws ApiConnectionError when the API cannot be reached', async () => {
    mockApi([])
    global.fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof global.fetch

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets'))

    expect(error).to.be.instanceOf(ApiConnectionError)
    expect((error as Error).message).to.contain('Could not connect to API')
  })

  it('throws ApiConnectionError on a timeout', async () => {
    mockApi([])
    global.fetch = (async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    }) as typeof global.fetch

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets'))

    expect(error).to.be.instanceOf(ApiConnectionError)
    expect((error as Error).message).to.contain('timed out')
  })

  // Followed, a redirect re-sends x-api-key to the new location: the Fetch standard strips only
  // Authorization and Cookie across origins. Node's fetch rejects the way stubbed here.
  it('refuses to follow a redirect, reporting it as ApiConnectionError', async () => {
    mockApi([])
    global.fetch = (async (_input: Request | URL | string, init?: RequestInit) => {
      if (init?.redirect === 'error') throw new TypeError('fetch failed', {cause: new Error('unexpected redirect')})
      return new Response(JSON.stringify({data: {}, requestId: 'r', status: 'success'}), {status: 200})
    }) as typeof global.fetch

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets'))

    expect(error).to.be.instanceOf(ApiConnectionError)
    expect((error as Error).message).to.contain('answered with a redirect, which the CLI does not follow')
    expect((error as Error).message).to.contain('--api-url')
  })
})

const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

describe('ApiClient request headers', () => {
  afterEach(() => {
    restoreApi()
  })

  it('sends a UUID x-request-id, a new one per request', async () => {
    mockApi([{method: 'GET', path: '/v2/things', response: {data: {}, requestId: 'r', status: 'success'}}])
    const client = new ApiClient({apiKey: KEY})

    await client.get('/v2/things')
    await client.get('/v2/things')

    const [first, second] = requests().map(request => request.headers['x-request-id'])
    expect(first).to.match(UUID)
    expect(second).to.match(UUID)
    expect(first).to.not.equal(second)
  })

  it('sends a User-Agent naming the CLI version, Node version and platform', async () => {
    mockApi([{method: 'GET', path: '/v2/things', response: {data: {}, requestId: 'r', status: 'success'}}])

    await new ApiClient({apiKey: KEY, version: '9.8.7'}).get('/v2/things')

    expect(requests()[0].headers['User-Agent']).to.equal(`databox-cli/9.8.7 (node ${process.version}; ${process.platform})`)
  })

  it('does not let a caller header replace the request ID', async () => {
    mockApi([{method: 'GET', path: '/v2/things', response: {data: {}, requestId: 'r', status: 'success'}}])

    await new ApiClient({apiKey: KEY}).get('/v2/things', undefined, {'x-request-id': 'caller'})

    expect(requests()[0].headers['x-request-id']).to.match(UUID)
  })
})

/** Answers with `respond` (which may throw, as fetch does) and records the x-request-id the client sent. */
function replyAndCapture(respond: () => Response): {sent: () => string | undefined} {
  let sent: string | undefined
  mockApi([])
  global.fetch = (async (_input: Request | URL | string, init?: RequestInit) => {
    sent = (init?.headers as Record<string, string>)['x-request-id']
    return respond()
  }) as typeof global.fetch
  return {sent: () => sent}
}

describe('ApiClient request IDs in errors', () => {
  afterEach(() => {
    restoreApi()
  })

  it('prefers the request ID in the body over the response header', async () => {
    replyAndCapture(() => new Response(JSON.stringify(errorEnvelope([{code: 'not_found', message: 'Gone'}], 'body-id')), {
      headers: {'x-request-id': 'header-id'}, status: 404,
    }))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets/1')) as ApiRequestError

    expect(error.requestId).to.equal('body-id')
  })

  // A proxy's 413 or 502 carries no envelope, only the header.
  it('takes the request ID from the response header when the body has none', async () => {
    replyAndCapture(() => new Response('', {headers: {'x-request-id': 'header-id'}, status: 413, statusText: 'Payload Too Large'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets/1')) as ApiRequestError

    expect(error.requestId).to.equal('header-id')
    expect(describeApiError(error)).to.equal('API error: 413 Payload Too Large\n  Request ID: header-id')
  })

  it('falls back to the request ID it sent when the response has neither', async () => {
    const {sent} = replyAndCapture(() => new Response('<html>Bad Gateway</html>', {status: 502, statusText: 'Bad Gateway'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets/1')) as ApiRequestError

    expect(sent()).to.match(UUID)
    expect(error.requestId).to.equal(sent())
  })

  it('carries the request ID it sent on a connection failure', async () => {
    const {sent} = replyAndCapture(() => {
      throw new TypeError('fetch failed')
    })

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiConnectionError

    expect(error).to.be.instanceOf(ApiConnectionError)
    expect(sent()).to.match(UUID)
    expect(error.requestId).to.equal(sent())
  })

  it('carries the request ID it sent on a timeout, and says it is the one to quote', async () => {
    const {sent} = replyAndCapture(() => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    })

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiConnectionError

    expect(error.requestId).to.equal(sent())
    expect(describeConnectionError(error)).to.equal(`Request timed out after 30s.\n  Request ID: ${sent()} `
      + '(sent by the CLI; the request may still have reached the API, so quote this ID to support)')
  })

  it('renders a connection error with no request ID as its message alone', () => {
    expect(describeConnectionError(new ApiConnectionError('Could not connect to Genie.'))).to.equal('Could not connect to Genie.')
  })
})

describe('ApiClient request bodies', () => {
  afterEach(() => {
    restoreApi()
  })

  // A JSON-parsed flag can be falsy (`--data 'null'`); it is still a body the user asked to send.
  for (const method of ['patch', 'post', 'put'] as const) {
    it(`sends a null body as JSON with a Content-Type (${method})`, async () => {
      mockApi([{method: method.toUpperCase(), path: '/v2/things', response: {data: {}, requestId: 'r', status: 'success'}}])

      await new ApiClient({apiKey: KEY})[method]('/v2/things', null)

      const [request] = requests()
      expect(request.body).to.equal(null)
      expect(request.headers['Content-Type']).to.equal('application/json')
    })
  }
})

/** A response whose headers arrive but whose body stream then fails with `error`. */
function brokenBody(status: number, error: Error): Response {
  const body = new ReadableStream({
    pull(controller) {
      controller.error(error)
    },
  })
  return new Response(body, {headers: {'Content-Type': 'application/json'}, status})
}

function respondWith(response: () => Response): void {
  mockApi([])
  global.fetch = (async () => response()) as typeof global.fetch
}

describe('ApiClient response bodies', () => {
  afterEach(() => {
    restoreApi()
  })

  for (const status of [200, 400]) {
    it(`maps a body cut off mid-read to ApiConnectionError (HTTP ${status})`, async () => {
      respondWith(() => brokenBody(status, new TypeError('terminated')))

      const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets'))

      expect(error).to.be.instanceOf(ApiConnectionError)
      expect((error as Error).message).to.contain('lost while reading')
    })

    it(`maps a body read that times out to ApiConnectionError (HTTP ${status})`, async () => {
      respondWith(() => brokenBody(status, new DOMException('The operation was aborted due to timeout', 'TimeoutError')))

      const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets'))

      expect(error).to.be.instanceOf(ApiConnectionError)
      expect((error as Error).message).to.contain('timed out')
    })
  }

  it('falls back to the HTTP status for a non-JSON error body', async () => {
    respondWith(() => new Response('<html>Bad Gateway</html>', {status: 502, statusText: 'Bad Gateway'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiRequestError

    expect(error).to.be.instanceOf(ApiRequestError)
    expect(error.message).to.equal('API error: 502 Bad Gateway')
    expect(error.errors).to.deep.equal([])
  })

  it('tolerates a JSON null error body', async () => {
    respondWith(() => new Response('null', {status: 500, statusText: 'Internal Server Error'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiRequestError

    expect(error).to.be.instanceOf(ApiRequestError)
    expect(error.message).to.equal('API error: 500 Internal Server Error')
  })

  it('maps a 2xx body that is not JSON to ApiRequestError, not a raw SyntaxError', async () => {
    respondWith(() => new Response('<html>Sign in</html>', {status: 200, statusText: 'OK'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiRequestError

    expect(error).to.be.instanceOf(ApiRequestError)
    expect(error.status).to.equal(200)
    expect(error.message).to.equal('The API response was not JSON (200 OK).')
  })

  it('ignores an errors field that is not an array', async () => {
    respondWith(() => new Response(JSON.stringify({errors: 'boom', requestId: 'req-1'}), {status: 500, statusText: 'Internal Server Error'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiRequestError

    expect(error.errors).to.deep.equal([])
    expect(error.requestId).to.equal('req-1')
  })
})

describe('isApiUrl', () => {
  it('accepts an absolute http or https URL', () => {
    expect(isApiUrl('https://api.databox.com')).to.equal(true)
    expect(isApiUrl('https://api.databox.com/')).to.equal(true)
    expect(isApiUrl('http://localhost:8080')).to.equal(true)
  })

  it('refuses a host without a scheme, which new URL() cannot parse', () => {
    expect(isApiUrl('api.databox.com')).to.equal(false)
    expect(isApiUrl('')).to.equal(false)
  })

  // These parse, with the schemes "localhost:" and "api.databox.com:", so only fetch() would fail.
  it('refuses a host:port without a scheme, which parses as some other scheme', () => {
    expect(isApiUrl('localhost:8080')).to.equal(false)
    expect(isApiUrl('api.databox.com:443')).to.equal(false)
  })

  it('refuses a scheme other than http and https', () => {
    expect(isApiUrl('ftp://api.databox.com')).to.equal(false)
    expect(isApiUrl('file:///etc/hosts')).to.equal(false)
  })

  it('refuses a username or password', () => {
    expect(isApiUrl('https://user@api.databox.com')).to.equal(false)
    expect(isApiUrl('https://user:secret@api.databox.com')).to.equal(false)
    expect(isApiUrl('https://:secret@api.databox.com')).to.equal(false)
  })

  it('refuses a query string', () => {
    expect(isApiUrl('https://api.databox.com/?token=secret')).to.equal(false)
  })

  it('refuses a fragment', () => {
    expect(isApiUrl('https://api.databox.com/#secret')).to.equal(false)
  })

  it('accepts a base path', () => {
    expect(isApiUrl('https://gateway.example.com/databox')).to.equal(true)
    expect(isApiUrl('https://gateway.example.com/databox/')).to.equal(true)
  })

  it('accepts surrounding whitespace', () => {
    expect(isApiUrl(' https://api.databox.com\n')).to.equal(true)
  })
})

describe('normalizeApiUrl', () => {
  it('trims surrounding whitespace and drops a trailing slash', () => {
    expect(normalizeApiUrl('https://api.databox.com ')).to.equal('https://api.databox.com')
    expect(normalizeApiUrl('https://api.databox.com/ ')).to.equal('https://api.databox.com')
    expect(normalizeApiUrl(' https://api.databox.com')).to.equal('https://api.databox.com')
    expect(normalizeApiUrl('https://api.databox.com\n')).to.equal('https://api.databox.com')
    expect(normalizeApiUrl('\thttps://api.databox.com//\r\n')).to.equal('https://api.databox.com')
  })

  it('keeps an IPv6 host and port, and lowercases the scheme and host', () => {
    expect(normalizeApiUrl('HTTP://[::1]:8080/')).to.equal('http://[::1]:8080')
    expect(normalizeApiUrl('HTTPS://API.Databox.com/Base/')).to.equal('https://api.databox.com/Base')
  })

  it('keeps a base path and a port', () => {
    expect(normalizeApiUrl('http://localhost:8080/api/ ')).to.equal('http://localhost:8080/api')
  })

  it('returns undefined for a value isApiUrl refuses', () => {
    expect(normalizeApiUrl('api.databox.com')).to.equal(undefined)
    expect(normalizeApiUrl('https://user:secret@api.databox.com')).to.equal(undefined)
  })
})

describe('describeInvalidApiUrl', () => {
  const lead = '--api-url must be an http:// or https:// base URL with no username, password, query string or fragment, e.g. https://api.databox.com. '
    + 'The value given (from --api-url or DATABOX_API_URL) '

  it('says a value without a scheme does not start with http:// or https://', () => {
    expect(describeInvalidApiUrl('api.databox.com')).to.equal(`${lead}does not start with http:// or https://.`)
    expect(describeInvalidApiUrl('localhost:8080')).to.equal(`${lead}does not start with http:// or https://.`)
  })

  it('names the scheme it was given, and nothing else of the URL', () => {
    expect(describeInvalidApiUrl('ftp://user:tok@host.example')).to.equal(`${lead}uses the scheme ftp:, not http: or https:.`)
  })

  it('says an http(s) value that does not parse is not a valid URL', () => {
    expect(describeInvalidApiUrl('https://')).to.equal(`${lead}is not a valid URL.`)
  })

  it('names a username or password, a query string and a fragment', () => {
    expect(describeInvalidApiUrl('https://user:tok@host.example')).to.equal(`${lead}contains a username or password.`)
    expect(describeInvalidApiUrl('https://host.example/?key=tok')).to.equal(`${lead}has a query string.`)
    expect(describeInvalidApiUrl('https://host.example/#tok')).to.equal(`${lead}has a fragment.`)
  })

  it('never repeats the value, which may be a key pasted into the wrong flag', () => {
    for (const value of [KEY, 'ftp://user:tok@secret-host.example', 'https://user:tok@secret-host.example/?k=v']) {
      const message = describeInvalidApiUrl(value)
      expect(message).to.not.contain('pak_')
      expect(message).to.not.contain('tok')
      expect(message).to.not.contain('secret')
    }
  })
})

describe('describeInvalidStoredApiUrl', () => {
  const lead = 'The API URL saved in /home/u/config.json '
  const tail = ' Run "databox auth login --api-url https://api.databox.com" to replace it.'

  it('names the config path and the problem, and never the value', () => {
    const noScheme = describeInvalidStoredApiUrl(KEY, '/home/u/config.json')
    const credentials = describeInvalidStoredApiUrl('https://user:tok@host.example', '/home/u/config.json')

    expect(noScheme).to.equal(`${lead}does not start with http:// or https://.${tail}`)
    expect(credentials).to.equal(`${lead}contains a username or password.${tail}`)
  })

  it('says a value that is not a string is not a string', () => {
    expect(describeInvalidStoredApiUrl(42, '/home/u/config.json')).to.equal(`${lead}is not a string.${tail}`)
  })
})

describe('ApiClient base URL', () => {
  let urls: string[]

  beforeEach(() => {
    urls = []
    mockApi([])
    global.fetch = (async (input: Request | URL | string) => {
      urls.push(String(input))
      return new Response(JSON.stringify({data: {}, requestId: 'r', status: 'success'}), {status: 200})
    }) as typeof global.fetch
  })

  afterEach(() => {
    restoreApi()
  })

  // Concatenated raw, a trailing space threw a bare TypeError, and "/ " sent the request to /%20/v2/….
  for (const baseUrl of ['https://api.databox.com ', 'https://api.databox.com/ ', ' https://api.databox.com', 'https://api.databox.com\n']) {
    it(`sends the request to the right URL for ${JSON.stringify(baseUrl)}`, async () => {
      await new ApiClient({apiKey: KEY, baseUrl}).get('/v2/datasets', {page: 1})

      expect(urls).to.deep.equal(['https://api.databox.com/v2/datasets?page=1'])
    })
  }

  it('keeps a base path', async () => {
    await new ApiClient({apiKey: KEY, baseUrl: 'https://gateway.example.com/databox/'}).get('/v2/datasets')

    expect(urls).to.deep.equal(['https://gateway.example.com/databox/v2/datasets'])
  })

  it('uses the default when given none', async () => {
    await new ApiClient({apiKey: KEY}).get('/v2/datasets')

    expect(urls).to.deep.equal(['https://api.databox.com/v2/datasets'])
  })

  it('refuses a base URL isApiUrl refuses, without repeating it', () => {
    expect(() => new ApiClient({apiKey: KEY, baseUrl: KEY})).to.throw(TypeError).with.property('message').that.does.not.contain('pak_')
  })
})

describe('describeApiError', () => {
  it('renders code, message, field and request ID', () => {
    const error = new ApiRequestError('Title is required.', 400, [
      {
        code: 'missing_required_field', field: 'title', message: 'Title is required.', type: 'validation',
      },
    ], 'req-9')

    expect(describeApiError(error)).to.equal([
      'missing_required_field',
      '  Title is required.',
      '  Field: title',
      '  Request ID: req-9',
    ].join('\n'))
  })

  it('omits the field line when the field is empty', () => {
    const error = new ApiRequestError('Dataset 9 does not exist.', 404, [
      {
        code: 'not_found', field: '', message: 'Dataset 9 does not exist.', type: 'not_found',
      },
    ], 'req-9')

    const text = describeApiError(error)

    expect(text).to.not.contain('Field:')
    expect(text).to.equal('not_found\n  Dataset 9 does not exist.\n  Request ID: req-9')
  })

  it('lists every error when the API returns several', () => {
    const error = new ApiRequestError('a; b', 400, [
      {
        code: 'invalid_input', field: 'name', message: 'a', type: 'validation',
      },
      {
        code: 'invalid_input', field: 'timezone', message: 'b', type: 'validation',
      },
    ])

    expect(describeApiError(error)).to.equal('invalid_input\n  a\n  Field: name\n  b\n  Field: timezone')
  })

  it('adds the Retry-After seconds before the request ID', () => {
    const error = new ApiRequestError('Rate limit exceeded.', 429, [
      {code: 'rate_limited', message: 'Rate limit exceeded.', type: 'request'},
    ], 'req-9')
    error.retryAfter = 12

    expect(describeApiError(error)).to.equal('rate_limited\n  Rate limit exceeded.\n  Retry after 12 s\n  Request ID: req-9')
  })

  it('adds the Retry-After seconds to a 409 modification_in_progress', () => {
    const message = 'The dataset\'s modification is being applied. Retry in a few seconds.'
    const error = new ApiRequestError(message, 409, [{code: 'modification_in_progress', message, type: 'request'}], 'req-7')
    error.retryAfter = 5

    expect(describeApiError(error)).to.equal(`modification_in_progress\n  ${message}\n  Retry after 5 s\n  Request ID: req-7`)
  })

  it('falls back to the message when there is no code', () => {
    const error = new ApiRequestError('API error: 502 Bad Gateway', 502)

    expect(describeApiError(error)).to.equal('API error: 502 Bad Gateway')
  })
})

describe('ApiClient trace', () => {
  afterEach(() => {
    restoreApi()
  })

  it('reports request, redacted header, response and request ID, and never the key', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/datasets',
      response: {data: {items: []}, requestId: 'req-77', status: 'success'},
    }])
    const lines: string[] = []

    await new ApiClient({apiKey: KEY, baseUrl: 'https://api.example.test', trace: line => lines.push(line)})
    .get('/v2/datasets', {search: 'x'})

    expect(lines[0]).to.equal('Request: GET https://api.example.test/v2/datasets?search=x')
    expect(lines[1]).to.equal('Headers: x-api-key: <redacted>')
    expect(lines[2]).to.match(/^Response: 200 \(\d+ms\)$/)
    expect(lines[3]).to.equal('Request ID: req-77')
    expect(lines.join('\n')).to.not.contain(KEY)
  })

  it('reports the request ID of a failed request', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/1',
      response: errorEnvelope([{
        code: 'not_found', field: '', message: 'Gone', type: 'not_found',
      }], 'req-err'),
      status: 404,
    }])
    const lines: string[] = []

    await caught(new ApiClient({apiKey: KEY, trace: line => lines.push(line)}).get('/v2/datasets/1'))

    expect(lines).to.include('Request ID: req-err')
    expect(lines.some(line => line.startsWith('Response: 404 '))).to.equal(true)
    expect(lines.join('\n')).to.not.contain(KEY)
  })

  // Deliberately no requestId in the envelope: that absence is what is under test.
  it('reports the request ID it sent when the response names none', async () => {
    mockApi([{method: 'GET', path: '/v2/datasets', response: {data: {items: []}, status: 'success'}}])
    const lines: string[] = []

    await new ApiClient({apiKey: KEY, trace: line => lines.push(line)}).get('/v2/datasets')

    const sent = requests()[0].headers['x-request-id']
    expect(sent).to.match(UUID)
    expect(lines).to.include(`Request ID: ${sent}`)
  })
})
