import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, metricDetail} from './fixtures.js'

const REQUIRED = [
  'metric', 'create',
  '--name', 'Revenue',
  '--dataset-id', '123',
  '--measure', '{"id":"amount","displayName":"Amount"}',
  '--date', '{"id":"created_at","displayName":"Created At"}',
]

describe('metric create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/metrics', response: envelope(metricDetail)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints the created metric readably', async () => {
    const {stdout} = await runCommand(REQUIRED, {root: process.cwd()})
    expect(stdout).to.include('ID: 42|custom_query_1')
    expect(stdout).to.include('Measure: Amount (amount)')
    expect(stdout).to.include('Filters: country ANY_OF US, UK')
  })

  // MetricsRequests.cs CreateMetricRequest: refs are {id, displayName}, filters one object.
  it('sends the create contract, with displayName refs and a filters object', async () => {
    await runCommand([
      ...REQUIRED,
      '--aggregation-function', 'avg',
      '--dimension', '{"id":"country","displayName":"Country"}',
      '--dimension', '{"id":"calc_8f3a","displayName":"Order channel"}',
      '--filters', '{"logicalOperator":"or","conditions":[{"field":"country","operator":"ANY_OF","values":["US"]}]}',
    ], {root: process.cwd()})

    expect(lastBody('POST', '/v2/metrics')).to.deep.equal({
      aggregationFunction: 'avg',
      datasetId: 123,
      date: {displayName: 'Created At', id: 'created_at'},
      dimensions: [{displayName: 'Country', id: 'country'}, {displayName: 'Order channel', id: 'calc_8f3a'}],
      filters: {conditions: [{field: 'country', operator: 'ANY_OF', values: ['US']}], logicalOperator: 'or'},
      measure: {displayName: 'Amount', id: 'amount'},
      name: 'Revenue',
    })
  })

  it('defaults the aggregation to sum', async () => {
    await runCommand(REQUIRED, {root: process.cwd()})
    expect(lastBody('POST', '/v2/metrics')).to.include({aggregationFunction: 'sum'})
  })

  it('rejects an unknown aggregation function before any request', async () => {
    const {error} = await runCommand([...REQUIRED, '--aggregation-function', 'median'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.lengthOf(0)
  })

  it('sends --idempotency-key as the Idempotency-Key header', async () => {
    const key = '3f0e4c8a-9b1d-4e2f-8a7c-5d6b1e2f3a4b'
    await runCommand([...REQUIRED, '--idempotency-key', key], {root: process.cwd()})
    expect(requests()[0].headers).to.include({'Idempotency-Key': key})
  })

  it('prints the returned metric whole with --json', async () => {
    const {stdout} = await runCommand([...REQUIRED, '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(metricDetail)
  })
})
