import {expect} from 'chai'

import {cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, serviceUnavailable} from './helpers/cli.js'
import {
  DEFAULT_RECORDS,
  DEFAULT_SCHEMA,
  ResourceTracker,
  createDataSource,
  createDataset,
  e2eName,
  tryIngestRecords,
  waitForIngestion,
} from './helpers/resources.js'

interface Dataset {
  datasetType: string
  id: number
  name: string
  parentDataSourceId: number | null
  timezone: string | null
}

describe('dataset', () => {
  const tracker = new ResourceTracker()
  let dataSourceId: string
  let datasetId: string
  let datasetName: string
  let ingestionId: string

  before(async function () {
    this.timeout(120_000)

    const dataSource = await createDataSource(tracker, 'dataset-src')
    dataSourceId = dataSource.id

    const dataset = await createDataset(tracker, dataSourceId, {label: 'ds'})
    datasetId = dataset.id
    datasetName = dataset.name
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('returns the created dataset by id', async () => {
    const dataset = json<Dataset>(await cli(['dataset', 'get', datasetId, '--json']))

    expectField(dataset, 'id', 'number')
    expect(String(dataset.id)).to.equal(datasetId)
    expect(dataset.name).to.equal(datasetName)
  })

  it('returns the schema it was created with', async () => {
    const schema = json<Array<{columnId: string; dataType: string}>>(
      await cli(['dataset', 'schema', datasetId, '--json']),
    )

    expect(schema).to.be.an('array').with.lengthOf(DEFAULT_SCHEMA.length)
    expect(schema.map((column) => column.columnId).sort()).to.deep.equal(
      DEFAULT_SCHEMA.map((column) => column.columnId).sort(),
    )
  })

  it('finds the dataset in the list', async () => {
    const listed = json<Dataset[]>(
      await cli(['dataset', 'list', '--data-source-id', dataSourceId, '--page-size', '50', '--json']),
    )

    const found = listed.find((item) => String(item.id) === datasetId)
    expect(found, `dataset ${datasetId} not in the listing`).to.not.equal(undefined)

    // Pins the list contract: the API names this parentDataSourceId, not dataSourceId,
    // and there is no createdAt on the list item.
    expectField(found!, 'parentDataSourceId', 'number')
    expectField(found!, 'datasetType', 'string')
    expect(String(found!.parentDataSourceId)).to.equal(dataSourceId)
  })

  // Unfiltered on purpose: this asserts the CLI's column mapping, not the server's
  // filtering. The dataSourceId filter was broken upstream (fixed in ingestion-api,
  // see test/e2e/README.md); switch this to a filtered listing once that is deployed.
  it('renders the list table with a populated Data Source ID column', async () => {
    const listed = json<Dataset[]>(await cli(['dataset', 'list', '--page-size', '10', '--json']))
    const withParent = listed.find((item) => item.parentDataSourceId !== null)
    expect(withParent, 'no dataset in the first page has a parent data source').to.not.equal(undefined)

    const table = expectOk(await cli(['dataset', 'list', '--page-size', '10']))

    expect(table.stdout).to.include('Data Source ID')
    // The column used to read `dataSourceId`, which the API does not return, so it
    // rendered blank for every row.
    expect(table.stdout).to.include(String(withParent!.parentDataSourceId))
  })

  it('lists the dataset under its data source', async () => {
    const listed = json<Dataset[]>(await cli(['data-source', 'datasets', dataSourceId, '--json']))
    expect(listed.some((item) => String(item.id) === datasetId)).to.equal(true)
  })

  it('updates the dataset name', async () => {
    const renamed = e2eName('ds-renamed')
    expectOk(await cli(['dataset', 'update', datasetId, '--name', renamed, '--json']))

    const reread = json<Dataset>(await cli(['dataset', 'get', datasetId, '--json']))
    expect(reread.name).to.equal(renamed)

    datasetName = renamed
  })

  it('ingests records', async function () {
    const result = await tryIngestRecords(datasetId, DEFAULT_RECORDS)

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    const response = json<{ingestionId: string}>(result)
    expectField(response, 'ingestionId', 'string')
    ingestionId = response.ingestionId
  })

  it('lists the ingestion', async function () {
    this.timeout(120_000)
    if (!ingestionId) this.skip()

    await retryRead(
      async () => {
        const ingestions = json<Array<{ingestionId: string; status: string}>>(
          await cli(['dataset', 'ingestions', datasetId, '--json']),
        )

        if (!ingestions.some((item) => item.ingestionId === ingestionId)) {
          throw new Error(`ingestion ${ingestionId} not listed yet`)
        }
      },
      {attempts: 10, delayMs: 3000},
    )
  })

  it('retrieves the ingestion by id and reaches a terminal state', async function () {
    this.timeout(120_000)
    if (!ingestionId) this.skip()

    const ingestion = await waitForIngestion(datasetId, ingestionId)
    if (!ingestion) this.skip()

    expectField(ingestion, 'status', 'string')
    expect(String(ingestion.status).toLowerCase()).to.not.equal('failed')
  })

  it('reports ingestion statistics', async () => {
    const statistics = json<Record<string, unknown>>(await cli(['dataset', 'ingestion-statistics', datasetId, '--json']))
    expect(statistics).to.be.an('object')
  })

  it('returns the ingested rows', async function () {
    this.timeout(120_000)
    if (!ingestionId) this.skip()

    const probe = await cli(['dataset', 'data', datasetId, '--page-size', '50', '--json'])
    const outage = serviceUnavailable(probe)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    await retryRead(
      async () => {
        const rows = json<Array<Record<string, unknown>>>(
          await cli(['dataset', 'data', datasetId, '--page-size', '50', '--json']),
        )

        if (rows.length === 0) throw new Error('no rows returned yet')
        expectKey(rows[0], 'id')
        expectKey(rows[0], 'name')
      },
      {attempts: 10, delayMs: 5000},
    )
  })

  it('lists and sets sync frequency', async () => {
    const frequencies = json<Array<{syncInterval: number}>>(
      await cli(['dataset', 'sync-frequencies', datasetId, '--json']),
    )
    expect(frequencies).to.be.an('array').that.is.not.empty
    expectField(frequencies[0], 'syncInterval', 'number')

    expectOk(await cli(['dataset', 'sync-frequencies', datasetId]))
    expectOk(await cliWithRetry(['dataset', 'set-sync-frequency', datasetId, '--interval', '1440']))
  })

  it('returns sync history', async () => {
    const history = json<unknown[]>(await cli(['dataset', 'sync-history', datasetId, '--json']))
    expect(history).to.be.an('array')
  })

  it('returns sync statistics', async () => {
    const statistics = json<Record<string, unknown>>(await cli(['dataset', 'sync-statistics', datasetId, '--json']))
    expect(statistics).to.be.an('object')
  })

  it('returns lineage', async () => {
    const lineage = json<{children: unknown[]; id: number; parents: unknown[]}>(
      await cli(['dataset', 'lineage', datasetId, '--json']),
    )

    expectField(lineage, 'id', 'number')
    expect(lineage.parents).to.be.an('array')
    expect(lineage.children).to.be.an('array')
  })

  it('reads verification status', async () => {
    const verification = json<Record<string, unknown>>(await cli(['dataset', 'verification', datasetId, '--json']))
    expect(verification).to.be.an('object')
  })

  it('sets verification status both ways', async () => {
    const result = expectOk(await cliWithRetry(['dataset', 'set-verification', datasetId, '--status', 'verified']))
    expect(result.stdout).to.include('verified')
    expect(json<{isVerified: boolean}>(await cli(['dataset', 'verification', datasetId, '--json'])).isVerified).to.equal(
      true,
    )

    expectOk(await cliWithRetry(['dataset', 'set-verification', datasetId, '--status', 'unverified']))
    expect(json<{isVerified: boolean}>(await cli(['dataset', 'verification', datasetId, '--json'])).isVerified).to.equal(
      false,
    )
  })

  it('reads permissions', async () => {
    const permissions = json<Record<string, unknown>>(await cli(['dataset', 'permissions', datasetId, '--json']))
    expect(permissions).to.be.an('object')
  })

  // Datasets created through the API cannot be duplicated: a pushed dataset has no
  // connector source to copy, and the ingestion identity of a copy is undefined. The API
  // rejects it with exit 2 and an actionable message (see doc/v2/spec/datasets.md).
  //
  // Until that rejection is deployed, the upstream's opaque "Data source type not found."
  // is still what comes back, so both are accepted here.
  it('refuses to duplicate a dataset created through the API', async () => {
    const result = await cli(['dataset', 'duplicate', datasetId, '--json'])

    expect(result.code, 'duplicating a pushed dataset should fail').to.not.equal(0)

    const message = errorText(result)
    const isDeployedMessage = /cannot be duplicated/i.test(message)
    const isUpstreamMessage = /data source type not found/i.test(message)

    if (isUpstreamMessage && !isDeployedMessage) {
      console.log('   note: environment predates the clearer rejection; got the upstream message')
    }

    expect(
      isDeployedMessage || isUpstreamMessage,
      `unexpected failure for duplicate: ${message}`,
    ).to.equal(true)
  })

  it('purges the dataset', async () => {
    const result = expectOk(await cli(['dataset', 'purge', datasetId, '--force']))
    expect(result.stdout).to.include(`${datasetId} purged.`)
  })

  it('rejects a non-numeric dataset id with exit 2', async () => {
    const result = await cli(['dataset', 'get', 'abc123', '--json'])

    expectExit(result, 2)
    expect(result.stderr).to.include('must be a numeric value')
  })

  it('deletes the dataset', async () => {
    const result = expectOk(await cli(['dataset', 'delete', datasetId, '--force']))
    expect(result.stdout).to.include(`${datasetId} deleted.`)

    tracker.forget('dataset', datasetId)
  })
})
