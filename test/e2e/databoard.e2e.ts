import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectKey, expectOk, json, skipWith,
} from './helpers/cli.js'

/** DataboardResponse.cs `DataboardListItem`. */
interface Databoard {
  id: number
  integrationKeys: string[]
  name: string
  tags: string[]
}

/** DataboardResponse.cs `DataboardDatablockMetric`: only what these tests read. */
interface DatablockMetric {
  dateRange: Record<string, unknown>
  dimensions: Array<Record<string, unknown>>
}

/** DataboardResponse.cs `DataboardMetricsResponse`. */
interface DataboardMetrics {
  datablocks: Array<{metrics: DatablockMetric[]}>
}

describe('databoard', () => {
  let databoards: Databoard[]

  before(async () => {
    databoards = json<Databoard[]>(await cliWithRetry(['databoard', 'list', '--page-size', '10', '--json']))
  })

  it('lists databoards', function () {
    if (databoards.length === 0) {
      skipWith(this, 'account has no databoards')
    }

    expectField(databoards[0], 'id', 'number')
    expectField(databoards[0], 'name', 'string')
    expect(databoards[0].tags).to.be.an('array')
    expect(databoards[0].integrationKeys).to.be.an('array')
  })

  it('renders the list as a table', async function () {
    if (databoards.length === 0) skipWith(this, 'account has no databoards')

    const result = expectOk(await cli(['databoard', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Name')
  })

  it('returns the metrics on a databoard, as the whole response', async function () {
    if (databoards.length === 0) skipWith(this, 'account has no databoards')

    const response = json<DataboardMetrics>(await cli(['databoard', 'metrics', String(databoards[0].id), '--json']))
    expect(response.datablocks).to.be.an('array')

    for (const datablock of response.datablocks) {
      expectField(datablock, 'id', 'number')
      expectField(datablock, 'name', 'string')
      expectKey(datablock, 'visualizationType')
      expect(datablock.metrics).to.be.an('array')

      for (const metric of datablock.metrics) {
        expectField(metric, 'id', 'string')
        expectField(metric, 'name', 'string')
        expectField(metric, 'sourceId', 'number')
        expectField(metric, 'sourceName', 'string')
        expectKey(metric, 'appliedFilters')
        expect(metric.dimensions).to.be.an('array')
        for (const dimension of metric.dimensions) {
          expectField(dimension, 'id', 'string')
          expectField(dimension, 'displayName', 'string')
        }

        for (const key of ['from', 'to', 'granularity']) expectKey(metric.dateRange, key)
      }
    }

    // One row per metric per datablock; dimensions and date ranges are objects, which a raw column
    // would print as [object Object].
    const table = expectOk(await cli(['databoard', 'metrics', String(databoards[0].id)]))
    if (response.datablocks.length > 0) {
      for (const header of ['Datablock', 'Visualization', 'Metric ID', 'Dimensions', 'Date range']) {
        expect(table.stdout).to.include(header)
      }
    }

    expect(table.stdout).to.not.include('[object Object]')
  })
})
