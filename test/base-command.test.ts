import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {dataSourceListItem} from './commands/data-source/fixtures.js'
import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from './helpers.js'

/**
 * The global behaviour every command inherits from BaseCommand: error rendering and exit
 * codes, --output/--json, --verbose, --no-color and --account-id. Asserted through real commands, since
 * that is the only place the wiring exists.
 */

const KEY = 'pak_secret-key-under-test'

const DATA_SOURCE = {
  ...dataSourceListItem,
  connectionId: null,
  id: 10,
  name: 'A source',
}

describe('base command: API errors', () => {
  beforeEach(() => {
    setupTestConfig(KEY)
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints code, message, field and request ID, and exits 1', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {
        errors: [{
          code: 'invalid_input', field: 'timezone', message: 'Unknown timezone.', type: 'validation',
        }],
        requestId: 'req-abc',
        status: 'error',
      },
      status: 400,
    }])

    const {error} = await runCommand(['data-source', 'get', '10'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message).to.equal('invalid_input\n  Unknown timezone.\n  Field: timezone\n  Request ID: req-abc')
  })

  it('omits the field line when the API sends an empty field', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {
        errors: [{
          code: 'not_found', field: '', message: 'Data source 10 not found.', type: 'not_found',
        }],
        requestId: 'req-abc',
        status: 'error',
      },
      status: 404,
    }])

    const {error} = await runCommand(['data-source', 'get', '10'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message).to.contain('not_found')
    expect(error?.message).to.contain('Request ID: req-abc')
    expect(error?.message).to.not.contain('Field:')
  })

  it('exits 2 when the API cannot be reached', async () => {
    mockApi([])
    global.fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof global.fetch

    const {error} = await runCommand(['data-source', 'get', '10'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('Could not connect to API')
  })

  it('exits 2 when the request times out', async () => {
    mockApi([])
    global.fetch = (async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    }) as typeof global.fetch

    const {error} = await runCommand(['data-source', 'get', '10'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('timed out')
  })

  it('reaches auth validate too, which used to flatten every failure to exit 1', async () => {
    mockApi([])
    global.fetch = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof global.fetch

    const {error} = await runCommand(['auth', 'validate'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
  })
})

describe('base command: --output', () => {
  beforeEach(() => {
    setupTestConfig(KEY)
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('rejects --json together with --output', async () => {
    const {error} = await runCommand(['data-source', 'list', '--json', '--output', 'csv'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--json')
  })

  it('rejects an unknown format', async () => {
    const {error} = await runCommand(['data-source', 'list', '--output', 'yaml'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
  })

  it('--output json matches --json', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: {data: {items: [DATA_SOURCE], pagination: {page: 0, pageSize: 25, totalItems: 1}}, requestId: 'test', status: 'success'},
    }])

    const viaOutput = await runCommand(['data-source', 'list', '--output', 'json'], {root: process.cwd()})
    const viaJson = await runCommand(['data-source', 'list', '--json'], {root: process.cwd()})

    expect(JSON.parse(viaOutput.stdout)).to.deep.equal([DATA_SOURCE])
    expect(viaOutput.stdout).to.equal(viaJson.stdout)
  })

  it('prints a list as CSV from the table columns, with no pagination footer', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: {
        data: {
          items: [DATA_SOURCE, {...DATA_SOURCE, id: 11, name: 'Sales, "EU"'}],
          pagination: {page: 0, pageSize: 25, totalItems: 40},
        },
        requestId: 'test',
        status: 'success',
      },
    }])

    const {stdout} = await runCommand(['data-source', 'list', '--output', 'csv'], {root: process.cwd()})

    expect(stdout.trimEnd().split('\n')).to.deep.equal([
      'ID,Name,Integration,Timezone,Connection ID,Status,Last activity',
      '10,A source,DataboxAPI,UTC,,error,2026-09-01T08:00:00+00:00',
      '11,"Sales, ""EU""",DataboxAPI,UTC,,error,2026-09-01T08:00:00+00:00',
    ])
  })

  it('prints the CSV header for an empty list', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: {data: {items: [], pagination: {page: 0, pageSize: 25, totalItems: 0}}, requestId: 'test', status: 'success'},
    }])

    const {stdout} = await runCommand(['data-source', 'list', '--output', 'csv'], {root: process.cwd()})

    expect(stdout.trimEnd()).to.equal('ID,Name,Integration,Timezone,Connection ID,Status,Last activity')
  })

  it('prints a single record as field,value rows', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {data: {...DATA_SOURCE, managedBy: {id: 1, name: 'Ann'}}, requestId: 'test', status: 'success'},
    }])

    const {stdout} = await runCommand(['data-source', 'get', '10', '--output', 'csv'], {root: process.cwd()})

    expect(stdout.trimEnd().split('\n')).to.deep.equal([
      'field,value',
      'connectionId,',
      'createdAt,2026-01-05T10:00:00+00:00',
      'id,10',
      'integrationKey,DataboxAPI',
      'lastActivityAt,2026-09-01T08:00:00+00:00',
      'name,A source',
      'statusInfo,"{""description"":""The connection credentials are no longer valid."",""errorType"":""connection"",'
        + '""reason"":""Invalid credentials"",""status"":""error"",""statusCode"":""invalidCredentials"",'
        + '""userAction"":""Reconnect the data source.""}"',
      'timezone,UTC',
      'managedBy,"{""id"":1,""name"":""Ann""}"',
    ])
  })
})

describe('base command: --verbose', () => {
  beforeEach(() => {
    setupTestConfig(KEY)
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {data: DATA_SOURCE, requestId: 'req-verbose', status: 'success'},
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('writes the trace to stderr and keeps stdout clean', async () => {
    const {stderr, stdout} = await runCommand(['data-source', 'get', '10', '--verbose', '--json'], {root: process.cwd()})

    expect(stderr).to.match(/Request: GET https?:\/\/\S+\/v2\/data-sources\/10\n/)
    expect(stderr).to.contain('Headers: x-api-key: <redacted>')
    expect(stderr).to.match(/Response: 200 \(\d+ms\)/)
    expect(stderr).to.contain('Request ID: req-verbose')
    expect(JSON.parse(stdout)).to.deep.equal(DATA_SOURCE)
  })

  it('never prints the API key', async () => {
    const {stderr, stdout} = await runCommand(['data-source', 'get', '10', '--verbose'], {root: process.cwd()})

    expect(stderr).to.not.contain(KEY)
    expect(stdout).to.not.contain(KEY)
  })

  it('is silent without the flag', async () => {
    const {stderr} = await runCommand(['data-source', 'get', '10'], {root: process.cwd()})

    expect(stderr).to.not.contain('Request:')
  })
})

describe('base command: --no-color', () => {
  beforeEach(() => {
    setupTestConfig(KEY)
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {data: DATA_SOURCE, requestId: 'test', status: 'success'},
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('is accepted by every command', async () => {
    const {error, stdout} = await runCommand(['data-source', 'get', '10', '--no-color'], {root: process.cwd()})

    expect(error).to.equal(undefined)
    expect(stdout).to.contain('A source')
  })
})

describe('base command: --account-id', () => {
  beforeEach(() => {
    setupTestConfig(KEY)
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources/10',
      response: {data: DATA_SOURCE, requestId: 'test', status: 'success'},
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sends the account as the x-account-id header', async () => {
    await runCommand(['data-source', 'get', '10', '--account-id', '200'], {root: process.cwd()})

    expect(requests()[0].headers['x-account-id']).to.equal('200')
  })

  it('rejects a non-numeric account with exit 2, before any request', async () => {
    const {error} = await runCommand(['data-source', 'get', '10', '--account-id', 'acme'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--account-id must be a numeric value')
    expect(requests()).to.have.length(0)
  })
})
