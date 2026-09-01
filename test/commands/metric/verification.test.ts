import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/metrics/42%7Ccustom_query_1/verification',
      response: {status: 'success', requestId: 'test', data: {status: 'verified'}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows verification status', async () => {
    const {stdout} = await runCommand(['metric', 'verification', '42|custom_query_1'], {root: process.cwd()})
    expect(stdout).to.include('verified')
  })
})
