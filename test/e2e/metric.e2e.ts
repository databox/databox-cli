import {expect} from 'chai'

import {cli, errorText, expectExit, expectField, expectOk, json, serviceUnavailable} from './helpers/cli.js'
import {ResourceTracker, createDataSource, createDataset, e2eName} from './helpers/resources.js'

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
  let metricId: string | undefined

  before(async function () {
    this.timeout(120_000)

    const dataSource = await createDataSource(tracker, 'metric-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'metric'})
    datasetId = dataset.id
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

  // Note: the API also accepts `aggregationFunction` and `dimensions` on create,
  // but the CLI exposes neither — a metric made here always uses API defaults.
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

    // The metric service rejects a dataset that has never received data. Verified
    // against the raw endpoint with and without aggregationFunction, so this tracks
    // the environment's ingestion pipeline being down, not a CLI defect.
    if (result.code !== 0 && /verify that datasetid references a valid dataset/i.test(errorText(result))) {
      console.log('   skip: metric service rejects a dataset with no ingested data (ingestion pipeline unavailable)')
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

    const metric = json<Metric>(await cli(['metric', 'get', metricId!, '--json']))
    expect(metric.id).to.equal(metricId)
  })

  it('handles a metric id containing a pipe without mangling it', async function () {
    if (!metricId) this.skip()

    // Metric ids look like "500|custom_query_100"; the command encodes them.
    const result = await cli(['metric', 'get', metricId!, '--json'])
    expectOk(result)
    expect(result.stdout).to.include(metricId!.split('|').pop()!)
  })

  it('updates the metric name', async function () {
    if (!metricId) this.skip()

    const renamed = e2eName('metric-renamed')
    expectOk(await cli(['metric', 'update', metricId!, '--name', renamed, '--json']))

    const reread = json<Metric>(await cli(['metric', 'get', metricId!, '--json']))
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

    expectOk(await cli(['metric', 'set-verification', metricId!, '--status', 'verified', '--json']))

    const verified = json<{isVerified: boolean}>(await cli(['metric', 'verification', metricId!, '--json']))
    expect(verified.isVerified).to.equal(true)

    expectOk(await cli(['metric', 'set-verification', metricId!, '--status', 'unverified', '--json']))
  })

  it('loads metric data', async function () {
    if (!metricId) this.skip()

    const today = new Date().toISOString().slice(0, 10)
    const result = await cli([
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

  it('deletes the metric', async function () {
    if (!metricId) this.skip()

    expectOk(await cli(['metric', 'delete', metricId!, '--force']))
    tracker.forget('metric', metricId!)
  })
})
