import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'PUT',
      path: '/v2/metrics/42%7Ccustom_query_1/verification',
      response: {status: 'success', requestId: 'test', data: {status: 'verified'}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('verified')
  })
})
