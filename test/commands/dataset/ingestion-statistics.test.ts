import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const statistics = {
  avgSuccessDuration: 1200,
  dailyStatistics: [{date: '2026-09-01', status: 'success'}, {date: '2026-09-02', status: 'failed'}],
  lastSuccessfulIngestionAt: '2026-09-01T08:00:00+00:00',
  successRate: 0.5,
}

describe('dataset ingestion-statistics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/ingestion-statistics', response: envelope(statistics)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows ingestion statistics', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion-statistics', '123'], {root: process.cwd()})
    expect(stdout).to.include('Last Successful Ingestion At: 2026-09-01T08:00:00+00:00')
    expect(stdout).to.include('Success Rate: 0.5')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion-statistics', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(statistics)
  })
})
