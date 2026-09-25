import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const statistics = {
  avgSuccessDuration: 42,
  dailyStatistics: [{date: '2026-09-01', status: 'success'}],
  lastSuccessfulUpdateAt: '2026-09-01T08:00:00+00:00',
  successRate: 1,
}

describe('dataset sync-statistics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/sync-history/statistics', response: envelope(statistics)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows sync statistics', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-statistics', '123'], {root: process.cwd()})
    expect(stdout).to.include('Last Successful Update At: 2026-09-01T08:00:00+00:00')
    expect(stdout).to.include('Avg Success Duration: 42')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-statistics', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(statistics)
  })
})
