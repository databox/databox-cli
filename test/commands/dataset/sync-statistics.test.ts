import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset sync-statistics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/sync-history/statistics', response: {status: 'success', requestId: 'test', data: {totalSyncs: 10, successfulSyncs: 9}}}])
  })
  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('shows sync statistics', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-statistics', '123'])
    expect(stdout).to.include('10')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-statistics', '123', '--json'])
    const json = JSON.parse(stdout)
    expect(json.totalSyncs).to.equal(10)
  })
})
