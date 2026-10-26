import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {dashboardMetrics, envelope, unwrapWarning} from '../dashboard/fixtures.js'

const WARNING = 'The "databoard metrics" command has been deprecated. Use "dashboard metrics" instead.'

describe('databoard metrics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/dashboards/1/metrics', response: envelope(dashboardMetrics)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  // /v2/databoards is deprecated in the API, so the old command reads the new route.
  it('reads /v2/dashboards/{id}/metrics and prints the same table as dashboard metrics', async () => {
    const {stdout} = await runCommand(['databoard', 'metrics', '1'], {root: process.cwd()})
    expect(requests().map(request => request.path)).to.deep.equal(['/v2/dashboards/1/metrics'])
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Datablock.+Visualization.+Metric ID.+Metric.+Source.+Dimensions.+Date range/)
    expect(lines[2]).to.match(/Sessions Trend\s.+line\s.+500\|custom_query_100/)
  })

  it('warns on stderr that it is deprecated', async () => {
    const {stderr} = await runCommand(['databoard', 'metrics', '1'], {root: process.cwd()})
    expect(unwrapWarning(stderr)).to.include(WARNING)
  })

  it('outputs the whole response with --json, the warning kept off stdout', async () => {
    const {stderr, stdout} = await runCommand(['databoard', 'metrics', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(dashboardMetrics)
    expect(unwrapWarning(stderr)).to.include(WARNING)
  })
})
