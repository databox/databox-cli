import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset ingestion-statistics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/ingestion-statistics',
      response: {status: 'success', requestId: 'test', data: {totalIngestions: 10, successfulIngestions: 9, failedIngestions: 1}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows ingestion statistics', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion-statistics', '123'], {root: process.cwd()})
    expect(stdout).to.include('10')
  })
})
