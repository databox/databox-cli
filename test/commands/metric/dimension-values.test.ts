import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const ARGS = ['metric', 'dimension-values', '--metric-id', '42|custom_query_1', '--source-id', '42', '--dimension-id', 'country']

describe('metric dimension-values', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/metrics/dimensions/values', response: envelope({dimensionValues: ['US', 'UK']})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists the values', async () => {
    const {stdout} = await runCommand(ARGS, {root: process.cwd()})
    expect(stdout).to.include('US')
    expect(stdout).to.include('UK')
  })

  // MetricsRequests.cs MetricDimensionQuery: sourceId and dimensionIds, not dataSourceId and dimensions.
  it('sends sourceId and dimensionIds', async () => {
    await runCommand(ARGS, {root: process.cwd()})
    expect(lastBody('POST', '/v2/metrics/dimensions/values')).to.deep.equal({
      metrics: [{dimensionIds: ['country'], metricId: '42|custom_query_1', sourceId: 42}],
    })
  })

  // Only the first dimension is honoured upstream, so the flag takes one.
  it('rejects a second --dimension-id', async () => {
    const {error} = await runCommand([...ARGS, '--dimension-id', 'city'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.lengthOf(0)
  })

  // Not a pure {items} list, so the response comes through whole.
  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand([...ARGS, '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({dimensionValues: ['US', 'UK']})
  })
})
