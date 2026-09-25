import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {connectionDetail} from './fixtures.js'

describe('connection get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/connections/1',
        response: {
          data: connectionDetail,
          requestId: 'test',
          status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets connection details', async () => {
    const {stdout} = await runCommand(['connection', 'get', '1'], {root: process.cwd()})
    expect(stdout).to.include('GA4 Connection')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'get', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(connectionDetail)
  })

  it('rejects non-numeric connection ID', async () => {
    const {error} = await runCommand(['connection', 'get', 'abc'], {root: process.cwd()})
    expect(error?.message).to.include('must be a numeric value')
  })
})
