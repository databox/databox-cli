import {expect} from 'chai'

import {
  cli,
  cliWithRetry,
  errorText,
  expectExit,
  expectField,
  expectOk,
  json,
  serviceUnavailable,
} from './helpers/cli.js'
import {
  ResourceTracker,
  createDataSource,
  createDataset,
  e2eName,
  tryIngestRecords,
  waitForIngestion,
} from './helpers/resources.js'

interface Metric {
  id: string
  name: string
  sourceId: number
  type: string
}

const DATE_FIELD = JSON.stringify({id: 'date', name: 'date'})
const MEASURE_FIELD = JSON.stringify({id: 'amount', name: 'amount'})

describe('metric', () => {
  const tracker = new ResourceTracker()
  let datasetId: string
  let hasData = false
  let metricId: string | undefined

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
    }
  })

  it('renders the list as a table', async () => {
    const result = expectOk(await cli(['metric', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Name')
  })

  it('creates a metric on the dataset', async function () {
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
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    // Only reachable when the fixture could not be populated — the metric service
    // rejects a dataset that has never received data.
    if (!hasData && result.code !== 0 && /verify that datasetid references a valid dataset/i.test(errorText(result))) {
      console.log('   skip: fixture dataset has no ingested data')
      this.skip()
    }

    const metric = json<Metric>(result)
    expectField(metric, 'id', 'string')
    metricId = tracker.track('metric', metric.id)
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
    expect(result.stderr).to.include('--measure')
  })

  it('returns the metric by id', async function () {
    if (!metricId) this.skip()

    const metric = json<Metric>(await cliWithRetry(['metric', 'get', metricId!, '--json']))
    expect(metric.id).to.equal(metricId)
  })

  it('handles a metric id containing a pipe without mangling it', async function () {
    if (!metricId) this.skip()

    // Metric ids look like "500|custom_query_100"; the command encodes them.
    const result = await cliWithRetry(['metric', 'get', metricId!, '--json'])
    expectOk(result)
    expect(result.stdout).to.include(metricId!.split('|').pop()!)
  })

  it('updates the metric name', async function () {
    if (!metricId) this.skip()

    const renamed = e2eName('metric-renamed')
    expectOk(await cli(['metric', 'update', metricId!, '--name', renamed, '--json']))

    const reread = json<Metric>(await cliWithRetry(['metric', 'get', metricId!, '--json']))
    expect(reread.name).to.equal(renamed)
  })

  it('reports where the metric is used', async function () {
    if (!metricId) this.skip()

    const usages = json<unknown>(await cli(['metric', 'usages', metricId!, '--json']))
    expect(usages).to.not.equal(null)
  })

  it('reads verification status', async function () {
    if (!metricId) this.skip()

    const verification = json<Record<string, unknown>>(await cli(['metric', 'verification', metricId!, '--json']))
    expect(verification).to.be.an('object')
  })

  it('sets verification status', async function () {
    if (!metricId) this.skip()

    expectOk(await cliWithRetry(['metric', 'set-verification', metricId!, '--status', 'verified', '--json']))

    const verified = json<{isVerified: boolean}>(await cli(['metric', 'verification', metricId!, '--json']))
    expect(verified.isVerified).to.equal(true)

    expectOk(await cliWithRetry(['metric', 'set-verification', metricId!, '--status', 'unverified', '--json']))
  })

  it('loads metric data', async function () {
    if (!metricId) this.skip()

    const today = new Date().toISOString().slice(0, 10)
    const result = await cliWithRetry([
      'metric',
      'data',
      '--metric-id',
      metricId!,
      '--dataset-id',
      datasetId,
      '--date-from',
      today,
      '--date-to',
      today,
      '--granularity',
      'daily',
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    expect(json<unknown>(result)).to.not.equal(null)
  })

  it('returns dimension values', async function () {
    if (!metricId) this.skip()

    // Exercises the batch request shape {metrics:[{dataSourceId,metricId,dimensions}]}
    // and the {dimensionValues} response — both were wrong before.
    const values = json<string[]>(
      await cliWithRetry(['metric', 'dimension-values', '--metric-id', metricId!, '--source-id', datasetId, '--dimension', 'name', '--json']),
    )

    expect(values).to.be.an('array')
  })

  it('returns a drilldown for a period', async function () {
    if (!metricId) this.skip()

    const end = Math.floor(Date.now() / 1000)
    const start = end - (30 * 24 * 60 * 60)
    const result = await cliWithRetry([
      'metric', 'drilldown',
      '--metric-id', metricId!,
      '--dataset-id', datasetId,
      '--start-timestamp', String(start),
      '--end-timestamp', String(end),
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    expect(json<unknown>(result)).to.not.equal(null)
  })

  it('creates a metric with an explicit aggregation and dimensions', async function () {
    if (!hasData) this.skip()

    const name = e2eName('metric-agg')
    const created = json<Metric>(
      await cli([
        'metric', 'create',
        '--name', name,
        '--dataset-id', datasetId,
        '--date', DATE_FIELD,
        '--measure', MEASURE_FIELD,
        '--aggregation-function', 'avg',
        '--dimension', JSON.stringify({id: 'name', name: 'name'}),
        '--json',
      ]),
    )

    expectField(created, 'id', 'string')

    // A metric created with dimensions comes back with a compound id
    // ("<source>|<query>|attribute") that DELETE /v2/metrics/{id} rejects. It is
    // removed when the fixture data source is torn down, so it is deliberately
    // not tracked — the cli-e2e-* sweeper is the backstop if that ever changes.
    expect(created.id).to.contain('|')
  })

  it('deletes the metric', async function () {
    if (!metricId) this.skip()

    expectOk(await cli(['metric', 'delete', metricId!, '--force']))
    tracker.forget('metric', metricId!)
  })
})
