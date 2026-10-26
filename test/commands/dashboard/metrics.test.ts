import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {dashboardMetrics, envelope} from './fixtures.js'

describe('dashboard metrics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/dashboards/1/metrics', response: envelope(dashboardMetrics)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('flattens datablocks into one row per metric', async () => {
    const {stdout} = await runCommand(['dashboard', 'metrics', '1'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Datablock.+Visualization.+Metric ID.+Metric.+Source.+Dimensions.+Date range/)
    expect(lines[2]).to.match(/Sessions Trend\s.+line\s.+500\|custom_query_100\s.+Sessions\s.+Google Analytics\s.+Country\s.+2025-01-01 to 2025-12-31 \(monthly\)/)
    expect(lines[3]).to.match(/Sessions Trend\s.+line\s.+GoogleAnalytics4@users\s.+Users/)
    expect(lines[4]).to.match(/^ Notes\s/)
    expect(stdout).to.not.include('[object Object]')
  })

  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand(['dashboard', 'metrics', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(dashboardMetrics)
  })
})
