import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'

/** DataboardResponse.cs DataboardMetricsResponse. */
const databoardMetrics = {
  datablocks: [
    {
      id: 100,
      metrics: [
        {
          appliedFilters: {
            groups: [{
              conditions: [{
                field: 'country', operator: 'eq', type: 'dimension', values: ['US', 'UK'],
              }], logicalOperator: 'OR',
            }],
            logicalOperator: 'AND',
          },
          dateRange: {from: '2025-01-01', granularity: 'monthly', to: '2025-12-31'},
          dimensions: [{displayName: 'Country', id: 'country'}],
          id: '500|custom_query_100',
          name: 'Sessions',
          sourceId: 500,
          sourceName: 'Google Analytics',
        },
        {
          appliedFilters: null,
          dateRange: {from: '2025-01-01', granularity: 'daily', to: '2025-01-31'},
          dimensions: [],
          id: 'GoogleAnalytics4@users',
          name: 'Users',
          sourceId: 500,
          sourceName: 'Google Analytics',
        },
      ],
      name: 'Sessions Trend',
      visualizationType: 'line',
    },
    {
      id: 101, metrics: [], name: 'Notes', visualizationType: null,
    },
  ],
}

describe('databoard metrics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/databoards/1/metrics', response: envelope(databoardMetrics)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('flattens datablocks into one row per metric', async () => {
    const {stdout} = await runCommand(['databoard', 'metrics', '1'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Datablock.+Visualization.+Metric ID.+Metric.+Source.+Dimensions.+Date range/)
    expect(lines[2]).to.match(/Sessions Trend\s.+line\s.+500\|custom_query_100\s.+Sessions\s.+Google Analytics\s.+Country\s.+2025-01-01 to 2025-12-31 \(monthly\)/)
    expect(lines[3]).to.match(/Sessions Trend\s.+line\s.+GoogleAnalytics4@users\s.+Users/)
    expect(lines[4]).to.match(/^ Notes\s/)
    expect(stdout).to.not.include('[object Object]')
  })

  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand(['databoard', 'metrics', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(databoardMetrics)
  })
})
