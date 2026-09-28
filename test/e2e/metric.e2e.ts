import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, serviceUnavailable, skipWith,
} from './helpers/cli.js'
import {csvColumn, parseCsv} from './helpers/csv.js'
import {
  ResourceTracker,
  createDataSource,
  createDataset,
  e2eName,
  tryIngestRecords,
  waitForIngestion,
} from './helpers/resources.js'

/** MetricsResponse.cs `MetricListItem`: only what these tests read. */
interface Metric {
  dimensions: Array<{displayName: string; id: string}>
  id: string
  name: string
  sourceId: null | number
  supportsDrilldown: boolean
}

/** MetricsResponse.cs `MetricDetail`: only what these tests read. */
interface MetricDetail extends Metric {
  aggregationFunction: null | string
  date: {displayName: string; id: string} | null
  measure: {displayName: string; id: string} | null
  type: string
}

/** MetricsResponse.cs `MetricDrilldownResponse`. */
interface Drilldown {
  items: Array<Record<string, unknown>> | null
  pagination: {totalItems: number} | null
  schema: {items: Array<{dataType: string; displayName: string; id: string}>} | null
}

/** DatasetResponse.cs `LineageNode`, which metric lineage shares. */
interface LineageNode {
  id: string
  name: string
  type: string
}

const NO_ROWS_YET = 'no drilldown rows yet'

const LINEAGE_TYPES = ['dataSource', 'dataset', 'mergedDataset', 'basicMetric', 'customMetric']

// Column references are {id, displayName}, the id being the schema column's.
const DATE_FIELD = JSON.stringify({displayName: 'date', id: 'date'})
const MEASURE_FIELD = JSON.stringify({displayName: 'amount', id: 'amount'})
const DIMENSION_FIELD = JSON.stringify({displayName: 'name', id: 'name'})

describe('metric', () => {
  const tracker = new ResourceTracker()
  let datasetId: string
  let hasData = false
  let metricId: string | undefined
  let dimensionMetric: MetricDetail | undefined

  before(async function () {
    this.timeout(180_000)

    const dataSource = await createDataSource(tracker, 'metric-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'metric'})
    datasetId = dataset.id

    // The metric service rejects a dataset that has never received data, so the
    // fixture has to be populated before any metric can be built on it.
    const ingested = await tryIngestRecords(datasetId)
    if (ingested.code === 0) {
      const {ingestionId} = JSON.parse(ingested.stdout) as {ingestionId: string}
      await waitForIngestion(datasetId, ingestionId)
      hasData = true
    } else {
      console.log(`   note: could not ingest fixture data — ${errorText(ingested)}`)
    }
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists metrics', async () => {
    const metrics = json<Metric[]>(await cli(['metric', 'list', '--page-size', '10', '--json']))

    expect(metrics).to.be.an('array')
    if (metrics.length > 0) {
      expectField(metrics[0], 'id', 'string')
      expectField(metrics[0], 'name', 'string')
      expectField(metrics[0], 'supportsDrilldown', 'boolean')
      expectKey(metrics[0], 'sourceId')
      expectKey(metrics[0], 'verificationInfo')
      expect(metrics[0].dimensions).to.be.an('array')
      for (const dimension of metrics[0].dimensions) {
        expectField(dimension, 'id', 'string')
        expectField(dimension, 'displayName', 'string')
      }
    }
  })

  it('renders the list as a table', async () => {
    const result = expectOk(await cli(['metric', 'list', '--page-size', '5']))
    for (const header of ['Name', 'Dimensions', 'Drilldown']) expect(result.stdout).to.include(header)

    // Dimensions are objects; a column that printed them raw showed [object Object].
    expect(result.stdout).to.not.include('[object Object]')
  })

  it('creates a metric on the dataset and returns its detail', async function () {
    const name = e2eName('metric')
    const result = await cli([
      'metric',
      'create',
      '--name',
      name,
      '--dataset-id',
      datasetId,
      '--date',
      DATE_FIELD,
      '--measure',
      MEASURE_FIELD,
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      skipWith(this, `${outage}`)
    }

    // Only reachable when the fixture could not be populated — the metric service
    // rejects a dataset that has never received data.
    if (!hasData && result.code !== 0) {
      skipWith(this, `fixture dataset has no ingested data, and create failed: ${errorText(result)}`)
    }

    const metric = json<MetricDetail>(result)
    expectField(metric, 'id', 'string')
    metricId = tracker.track('metric', metric.id)

    expect(metric.name).to.equal(name)
    expect(metric.measure).to.deep.equal({displayName: 'amount', id: 'amount'})
    expect(metric.date).to.deep.equal({displayName: 'date', id: 'date'})
    expect(metric.aggregationFunction).to.equal('sum')
    expectField(metric, 'type', 'string')
    expectKey(metric, 'filters')
  })

  it('rejects malformed JSON in --measure with exit 2', async () => {
    const result = await cli([
      'metric',
      'create',
      '--name',
      'irrelevant',
      '--dataset-id',
      datasetId,
      '--date',
      DATE_FIELD,
      '--measure',
      '{not json',
    ])

    expectExit(result, 2)
    expect(errorText(result)).to.include('--measure')
  })

  // The unit harness refuses an empty flag value; the real binary passes it through, and an
  // empty string is not JSON.
  it('rejects an empty --filters with exit 2', async () => {
    const result = await cli([
      'metric', 'create',
      '--name', 'irrelevant',
      '--dataset-id', datasetId,
      '--date', DATE_FIELD,
      '--measure', MEASURE_FIELD,
      '--filters', '',
    ])

    expectExit(result, 2)
    expect(errorText(result)).to.include('Invalid JSON for --filters')
  })

  it('rejects an empty --name with exit 2', async () => {
    const result = await cli([
      'metric', 'create',
      '--name', '',
      '--dataset-id', datasetId,
      '--date', DATE_FIELD,
      '--measure', MEASURE_FIELD,
      '--json',
    ])
    // A regression sends it; should the API accept it, teardown removes what it created.
    if (result.code === 0) tracker.track('metric', json<{id: string}>(result).id)

    expectExit(result, 2)
    expect(errorText(result)).to.include('--name cannot be empty')
  })

  it('returns the metric by id', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const metric = json<MetricDetail>(await cliWithRetry(['metric', 'get', metricId!, '--json']))
    expect(metric.id).to.equal(metricId)
    expect(metric.measure?.id).to.equal('amount')

    const table = expectOk(await cliWithRetry(['metric', 'get', metricId!]))
    expect(table.stdout).to.include('Measure: amount')
    expect(table.stdout).to.include('Aggregation: sum')
  })

  it('handles a metric id containing a pipe without mangling it', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    // Metric ids look like "500|custom_query_100"; the command encodes them.
    const result = await cliWithRetry(['metric', 'get', metricId!, '--json'])
    expectOk(result)
    expect(result.stdout).to.include(metricId!.split('|').pop()!)
  })

  it('updates the metric name and returns the detail', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const renamed = e2eName('metric-renamed')
    const updated = json<MetricDetail>(await cli(['metric', 'update', metricId!, '--name', renamed, '--json']))
    expect(updated.name).to.equal(renamed)

    const reread = json<MetricDetail>(await cliWithRetry(['metric', 'get', metricId!, '--json']))
    expect(reread.name).to.equal(renamed)
  })

  it('reports the metric\'s lineage, with its dataset as the parent', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const lineage = json<{children: LineageNode[]; id: string; parents: LineageNode[]}>(
      await cliWithRetry(['metric', 'lineage', metricId!, '--json']),
    )

    // A metric's own lineage id is its key, a string.
    expect(lineage.id).to.equal(metricId)
    expect(lineage.children).to.be.an('array')
    expect(lineage.parents.map(node => node.id), 'the metric\'s dataset should be a parent').to.include(datasetId)
    for (const node of [...lineage.parents, ...lineage.children]) {
      expectField(node, 'id', 'string')
      expect(LINEAGE_TYPES, `lineage node ${node.id} type`).to.include(node.type)
    }

    const table = expectOk(await cliWithRetry(['metric', 'lineage', metricId!]))
    expect(table.stdout).to.include('Relation')
    expect(table.stdout).to.include(datasetId)
  })

  it('reports where the metric is used, as a bare array', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const usages = json<Array<Record<string, unknown>>>(await cli(['metric', 'usages', metricId!, '--json']))
    expect(usages).to.be.an('array')

    // A fresh metric is used nowhere; check the row shape only if that ever changes.
    for (const usage of usages) {
      for (const key of ['referenceType', 'referenceId', 'referenceName', 'datablockName']) expectKey(usage, key)
    }

    expectOk(await cli(['metric', 'usages', metricId!]))
  })

  it('reads verification status', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const verification = json<Record<string, unknown>>(await cli(['metric', 'verification', metricId!, '--json']))
    expect(verification).to.be.an('object')
  })

  it('sets verification status', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    const verified = json<{isVerified: boolean}>(
      await cliWithRetry(['metric', 'set-verification', metricId!, '--status', 'verified', '--json']),
    )
    expect(verified.isVerified).to.equal(true)
    expect(json<{isVerified: boolean}>(await cli(['metric', 'verification', metricId!, '--json'])).isVerified).to.equal(true)

    expectOk(await cliWithRetry(['metric', 'set-verification', metricId!, '--status', 'unverified', '--json']))
  })

  it('returns a drilldown whose table cells sit under their schema headers', async function () {
    this.timeout(180_000)
    if (!metricId) skipWith(this, 'no metric was created')

    const end = Math.floor(Date.now() / 1000)
    const start = end - (30 * 24 * 60 * 60)
    const argv = [
      'metric', 'drilldown',
      '--metric-id', metricId!,
      '--source-id', datasetId,
      '--start-timestamp', String(start),
      '--end-timestamp', String(end),
    ]

    const probe = await cliWithRetry([...argv, '--json'])
    const outage = serviceUnavailable(probe)
    if (outage) {
      skipWith(this, `${outage}`)
    }

    // --json is the whole response: the rows beside their schema and pagination.
    const first = json<Drilldown>(probe)
    expectKey(first, 'items')
    expectKey(first, 'schema')
    expectKey(first, 'pagination')

    let drilldown: Drilldown
    try {
      drilldown = await retryRead(
        async () => {
          const data = json<Drilldown>(await cliWithRetry([...argv, '--json']))
          if (!data.items?.length || !data.schema?.items.length) throw new Error(NO_ROWS_YET)
          return data
        },
        {attempts: 8, delayMs: 5000},
      )
    } catch (error) {
      // Only an empty result is a reason to skip; a failed command is a failure.
      if (!(error instanceof Error) || error.message !== NO_ROWS_YET) throw error
      skipWith(this, 'the drilldown returned no rows for the fixture\'s period, so there are no cells to check')
    }

    const schema = drilldown!.schema!.items
    for (const column of schema) {
      expectField(column, 'id', 'string')
      expectField(column, 'displayName', 'string')
    }

    // The table and CSV read each cell as row[schema id]. If upstream keyed rows differently, every
    // column would render empty under a correct header.
    const rowKeys = Object.keys(drilldown!.items![0])
    const rows = parseCsv(expectOk(await cliWithRetry([...argv, '--output', 'csv'])).stdout)
    expect(rows[0]).to.deep.equal(schema.map(column => column.displayName))

    for (const column of schema) {
      const cells = csvColumn(rows, column.displayName)
      expect(
        cells.some(cell => cell !== ''),
        `every "${column.displayName}" cell is empty: schema ids ${JSON.stringify(schema.map(c => c.id))}, row keys ${JSON.stringify(rowKeys)}`,
      ).to.equal(true)
    }
  })

  it('creates a metric with an explicit aggregation and dimensions', async function () {
    if (!hasData) {
      skipWith(this, 'fixture dataset has no ingested data')
    }

    const name = e2eName('metric-agg')
    const created = json<MetricDetail>(
      await cli([
        'metric', 'create',
        '--name', name,
        '--dataset-id', datasetId,
        '--date', DATE_FIELD,
        '--measure', MEASURE_FIELD,
        '--aggregation-function', 'avg',
        '--dimension', DIMENSION_FIELD,
        '--json',
      ]),
    )

    expectField(created, 'id', 'string')
    expect(created.aggregationFunction).to.equal('avg')
    expect(created.dimensions.map(dimension => dimension.displayName)).to.include('name')

    // A metric created with dimensions comes back with a compound id
    // ("<source>|<query>|attribute") that DELETE /v2/metrics/{id} rejects. It is
    // removed when the fixture data source is torn down, so it is deliberately
    // not tracked — the cli-e2e-* sweeper is the backstop if that ever changes.
    expect(created.id).to.contain('|')
    dimensionMetric = created
  })

  it('returns dimension values', async function () {
    if (!dimensionMetric) {
      skipWith(this, 'no metric with a dimension was created')
    }

    // The batch body is {metrics: [{sourceId, metricId, dimensionIds}]}; the response is
    // returned whole, {dimensionValues}.
    const dimensionId = dimensionMetric!.dimensions[0].id
    const argv = [
      'metric', 'dimension-values',
      '--metric-id', dimensionMetric!.id,
      '--source-id', datasetId,
      '--dimension-id', dimensionId,
    ]

    const values = json<{dimensionValues: string[]}>(await cliWithRetry([...argv, '--json']))
    expect(values.dimensionValues).to.be.an('array')

    const table = expectOk(await cliWithRetry(argv))
    expect(table.stdout).to.match(values.dimensionValues.length > 0 ? /Value/ : /No results found\./)
  })

  it('deletes the metric', async function () {
    if (!metricId) skipWith(this, 'no metric was created')

    expectOk(await cli(['metric', 'delete', metricId!, '--force']))
    tracker.forget('metric', metricId!)
  })
})
