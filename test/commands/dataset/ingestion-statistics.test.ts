import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset ingestion-statistics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/ingestion-statistics',
      response: {data: {failedIngestions: 1, successfulIngestions: 9, totalIngestions: 10}, requestId: 'test', status: 'success'},
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows ingestion statistics', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion-statistics', '123'], {root: process.cwd()})
    expect(stdout).to.include('10')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion-statistics', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.totalIngestions).to.equal(10)
  })
})
