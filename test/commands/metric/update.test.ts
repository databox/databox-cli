import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, metricDetail} from './fixtures.js'

const PATH = '/v2/metrics/42%7Ccustom_query_1'

describe('metric update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: PATH, response: envelope({...metricDetail, name: 'Updated'})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints the updated metric readably', async () => {
    const {stdout} = await runCommand(['metric', 'update', '42|custom_query_1', '--name', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Name: Updated')
    expect(stdout).to.include('Aggregation: sum')
  })

  it('sends only the fields given', async () => {
    await runCommand(['metric', 'update', '42|custom_query_1', '--name', 'Updated'], {root: process.cwd()})
    expect(lastBody('PATCH', PATH)).to.deep.equal({name: 'Updated'})
  })

  // MetricsRequests.cs UpdateMetricRequest: the same refs and filters object as create.
  it('sends displayName refs, dimensions and a filters object', async () => {
    await runCommand([
      'metric', 'update', '42|custom_query_1',
      '--measure', '{"id":"amount","displayName":"Amount"}',
      '--date', '{"id":"created_at","displayName":"Created At"}',
      '--aggregation-function', 'max',
      '--dimension', '{"id":"country","displayName":"Country"}',
      '--filters', '{"logicalOperator":"and","conditions":[{"field":"amount","operator":"GT","values":["50"]}]}',
    ], {root: process.cwd()})

    expect(lastBody('PATCH', PATH)).to.deep.equal({
      aggregationFunction: 'max',
      date: {displayName: 'Created At', id: 'created_at'},
      dimensions: [{displayName: 'Country', id: 'country'}],
      filters: {conditions: [{field: 'amount', operator: 'GT', values: ['50']}], logicalOperator: 'and'},
      measure: {displayName: 'Amount', id: 'amount'},
    })
  })

  // An empty list clears the stored conditions; omitting it keeps them.
  it('sends conditions: [] through, to clear the filters', async () => {
    await runCommand(['metric', 'update', '42|custom_query_1', '--filters', '{"conditions":[]}'], {root: process.cwd()})
    expect(lastBody('PATCH', PATH)).to.deep.equal({filters: {conditions: []}})
  })

  it('sends logicalOperator alone, to change only the operator', async () => {
    await runCommand(['metric', 'update', '42|custom_query_1', '--filters', '{"logicalOperator":"or"}'], {root: process.cwd()})
    expect(lastBody('PATCH', PATH)).to.deep.equal({filters: {logicalOperator: 'or'}})
  })

  // MetricsService replaces the stored dimensions whenever the list is non-null, so [] clears them.
  it('sends dimensions: [] with --clear-dimensions', async () => {
    await runCommand(['metric', 'update', '42|custom_query_1', '--clear-dimensions'], {root: process.cwd()})
    expect(lastBody('PATCH', PATH)).to.deep.equal({dimensions: []})
  })

  it('rejects --clear-dimensions with --dimension', async () => {
    const {error} = await runCommand([
      'metric', 'update', '42|custom_query_1', '--clear-dimensions', '--dimension', '{"id":"country","displayName":"Country"}',
    ], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.lengthOf(0)
  })

  it('rejects an unknown aggregation function before any request', async () => {
    const {error} = await runCommand(['metric', 'update', '42|custom_query_1', '--aggregation-function', 'median'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.lengthOf(0)
  })

  it('prints the returned metric whole with --json', async () => {
    const {stdout} = await runCommand(['metric', 'update', '42|custom_query_1', '--name', 'Updated', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({...metricDetail, name: 'Updated'})
  })
})
