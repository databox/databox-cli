import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, integrationMetricDetail, metricDetail} from './fixtures.js'

describe('metric get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {method: 'GET', path: '/v2/metrics/42%7Ccustom_query_1', response: envelope(metricDetail)},
      {method: 'GET', path: '/v2/metrics/GoogleAnalytics4%40sessions', response: envelope(integrationMetricDetail)},
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('spells out a custom-query metric definition', async () => {
    const {stdout} = await runCommand(['metric', 'get', '42|custom_query_1'], {root: process.cwd()})
    expect(stdout).to.include('Name: Revenue')
    expect(stdout).to.include('Type: event')
    expect(stdout).to.include('Measure: Amount (amount)')
    expect(stdout).to.include('Date: Created At (created_at)')
    expect(stdout).to.include('Aggregation: sum')
    expect(stdout).to.include('Filters: country ANY_OF US, UK')
    expect(stdout).to.include('Dimensions: Country, Order channel')
    expect(stdout).to.include('Verified: yes (at 2026-09-01T08:00:00+00:00 by Ada)')
    expect(stdout).to.not.include('[object Object]')
  })

  it('shows N/A for the definition of a metric without one', async () => {
    const {stdout} = await runCommand(['metric', 'get', 'GoogleAnalytics4@sessions'], {root: process.cwd()})
    expect(stdout).to.include('Type: unknown')
    expect(stdout).to.include('Measure: N/A')
    expect(stdout).to.include('Filters: N/A')
    expect(stdout).to.include('Dimensions: none')
    expect(stdout).to.include('Verified: no')
  })

  it('outputs the whole detail with --json', async () => {
    const {stdout} = await runCommand(['metric', 'get', '42|custom_query_1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(metricDetail)
  })

  it('outputs field,value rows with --output csv', async () => {
    const {stdout} = await runCommand(['metric', 'get', '42|custom_query_1', '--output', 'csv'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.equal('field,value')
    expect(lines).to.include('aggregationFunction,sum')
  })
})
