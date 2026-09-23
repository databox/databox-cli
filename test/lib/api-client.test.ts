import {expect} from 'chai'

import {
  ApiClient, ApiConnectionError, ApiRequestError, describeApiError,
} from '../../src/lib/api-client.js'
import {mockApi, restoreApi} from '../helpers.js'

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

  it('ignores an errors field that is not an array', async () => {
    respondWith(() => new Response(JSON.stringify({errors: 'boom', requestId: 'req-1'}), {status: 500, statusText: 'Internal Server Error'}))

    const error = await caught(new ApiClient({apiKey: KEY}).get('/v2/datasets')) as ApiRequestError

    expect(error.errors).to.deep.equal([])
    expect(error.requestId).to.equal('req-1')
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
})
