import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, serviceUnavailable, skipWith,
} from './helpers/cli.js'
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

/** DatasetResponse.cs `DatasetListItem`: only what these tests read. */
interface Dataset {
  createdAt: null | string
  dataSourceId: null | number
  id: number
  name: string
  timezone: null | string
}

/** DatasetResponse.cs `DatasetDetail`: only what these tests read. */
interface DatasetDetail extends Dataset {
  columnCount: number
  rowCount: number
  syncInterval: null | number
}

/** DatasetResponse.cs `DatasetPermissions`. */
interface Permissions {
  accessLevel: string
  accessList: Array<{id: number; name: string}> | null
}

/** DatasetResponse.cs `LineageNode`. */
interface LineageNode {
  id: string
  name: string
  type: string
}

/** The node types DatasetService reports; a dataset's own kind is deliberately not one of them. */
const LINEAGE_TYPES = ['dataSource', 'dataset', 'mergedDataset', 'basicMetric', 'customMetric']

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
    const dataset = json<DatasetDetail>(await cli(['dataset', 'get', datasetId, '--json']))

    expectField(dataset, 'id', 'number')
    expect(String(dataset.id)).to.equal(datasetId)
    expect(dataset.name).to.equal(datasetName)
    expect(String(dataset.dataSourceId)).to.equal(dataSourceId)

    // The DatasetDetail contract: the list item's fields plus the detail-only ones.
    expectField(dataset, 'ingestionSupported', 'boolean')
    expectField(dataset, 'columnCount', 'number')
    expectField(dataset, 'rowCount', 'number')
    for (const key of [
      'statusInfo', 'syncInfo', 'verificationInfo', 'ingestionInfo', 'createdAt', 'lastActivityAt',
      'managedBy', 'size', 'maxSize', 'syncInterval',
    ]) {
      expectKey(dataset, key)
    }

    // Moved to `dataset schema`; the detail must not carry it any more.
    expect(dataset, 'primaryKey belongs to the schema response').to.not.have.property('primaryKey')
  })

  it('returns the schema it was created with, and its primary key', async () => {
    const schema = json<{items: Array<{dataType: string; id: string}>; primaryKey?: string[]}>(
      await cli(['dataset', 'schema', datasetId, '--json']),
    )

    expect(schema.items).to.be.an('array').with.lengthOf(DEFAULT_SCHEMA.length)
    expect(schema.items.map(column => column.id).sort()).to.deep.equal(
      DEFAULT_SCHEMA.map(column => column.id).sort(),
    )

    // createDataset keys on the first column.
    expect(schema.primaryKey).to.deep.equal([DEFAULT_SCHEMA[0].id])

    const table = expectOk(await cli(['dataset', 'schema', datasetId]))
    expect(table.stdout).to.include('Display Name')
    expect(table.stdout).to.include(`Primary key: ${DEFAULT_SCHEMA[0].id}`)
  })

  it('finds the dataset in the list', async () => {
    const listed = json<Dataset[]>(
      await cli(['dataset', 'list', '--data-source-id', dataSourceId, '--page-size', '50', '--json']),
    )

    const found = listed.find(item => String(item.id) === datasetId)
    expect(found, `dataset ${datasetId} not in the listing`).to.not.equal(undefined)

    // Pins the list contract: dataSourceId (formerly parentDataSourceId), no datasetType, and the
    // status, sync, verification, ingestion and activity fields.
    expectField(found!, 'dataSourceId', 'number')
    expect(String(found!.dataSourceId)).to.equal(dataSourceId)
    expectField(found!, 'ingestionSupported', 'boolean')
    for (const key of ['statusInfo', 'syncInfo', 'verificationInfo', 'ingestionInfo', 'createdAt', 'lastActivityAt']) {
      expectKey(found!, key)
    }

    expect(found!).to.not.have.property('parentDataSourceId')
    expect(found!).to.not.have.property('datasetType')
  })

  it('sorts the list by a supported field', async () => {
    const listed = json<Dataset[]>(
      await cli(['dataset', 'list', '--sort-by', 'createdAt', '--sort-order', 'desc', '--page-size', '20', '--json']),
    )

    const created = listed.map(item => item.createdAt).filter((value): value is string => value !== null)
    expect(created.length, 'no dataset on the first page reports createdAt').to.be.greaterThan(0)

    const descending = [...created].sort((a, b) => Date.parse(b) - Date.parse(a))
    expect(created, 'createdAt should be in descending order').to.deep.equal(descending)
  })

  // DatasetService rejects any other sort field with a 400; the CLI now offers only the valid
  // three as options, so a bad one never reaches the API and fails locally as a usage error.
  it('rejects an unsupported sort field with exit 2 before calling the API', async () => {
    const result = await cli(['dataset', 'list', '--sort-by', 'datasetType', '--json'])

    expectExit(result, 2)
    expect(errorText(result)).to.match(/to be one of: name, createdAt, lastActivityAt/)
  })

  // Unfiltered on purpose: this asserts the CLI's column mapping, not the server's
  // filtering. The dataSourceId filter was broken upstream (fixed in ingestion-api,
  // see test/e2e/README.md); switch this to a filtered listing once that is deployed.
  it('renders the list table with a populated Data Source column', async () => {
    const listed = json<Dataset[]>(await cli(['dataset', 'list', '--page-size', '10', '--json']))
    const withParent = listed.find(item => item.dataSourceId !== null)
    expect(withParent, 'no dataset in the first page has a data source').to.not.equal(undefined)

    const table = expectOk(await cli(['dataset', 'list', '--page-size', '10']))

    for (const header of ['Data Source', 'Ingestion', 'Status', 'Sync Status', 'Last Activity']) {
      expect(table.stdout).to.include(header)
    }

    // A column reading a field the API does not return renders blank for every row.
    expect(table.stdout).to.include(String(withParent!.dataSourceId))
  })

  it('lists the dataset under its data source', async () => {
    const listed = json<Dataset[]>(await cli(['data-source', 'datasets', dataSourceId, '--json']))
    expect(listed.some(item => String(item.id) === datasetId)).to.equal(true)
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
      skipWith(this, `${outage}`)
    }

    const response = json<{ingestionId: string}>(result)
    expectField(response, 'ingestionId', 'string')
    ingestionId = response.ingestionId
  })

  // DatasetService.IngestData rejects an empty records list; the CLI refuses it first.
  it('rejects an empty records array with exit 2 before calling the API', async () => {
    const result = await cli(['dataset', 'ingest', datasetId, '--records', '[]'])

    expectExit(result, 2)
    expect(errorText(result)).to.include('At least one record must be provided')
  })

  // The unit harness refuses an empty flag value; the real binary passes it through. An empty
  // --records used to fall through to --file and then stdin, as if it had not been given.
  it('rejects an empty --records as invalid JSON with exit 2', async () => {
    // Parsing fails before any request, so the id need not exist.
    const result = await cli(['dataset', 'ingest', '999999999999', '--records', ''])

    expectExit(result, 2)
    expect(errorText(result)).to.include('Invalid JSON for --records')
  })

  // Likewise an empty --file used to fall through to stdin.
  it('rejects an empty --file as a missing file with exit 2', async () => {
    const result = await cli(['dataset', 'ingest', '999999999999', '--file', ''])

    expectExit(result, 2)
    expect(errorText(result)).to.include('File not found')
  })

  it('lists the ingestion', async function () {
    this.timeout(120_000)
    if (!ingestionId) skipWith(this, 'no ingestion was started')

    await retryRead(
      async () => {
        const ingestions = json<Array<{id: string; status: string}>>(
          await cli(['dataset', 'ingestions', datasetId, '--json']),
        )

        if (!ingestions.some(item => item.id === ingestionId)) {
          throw new Error(`ingestion ${ingestionId} not listed yet`)
        }
      },
      {attempts: 10, delayMs: 3000},
    )
  })

  it('retrieves the ingestion by id and reaches a terminal state', async function () {
    this.timeout(120_000)
    if (!ingestionId) skipWith(this, 'no ingestion was started')

    const ingestion = await waitForIngestion(datasetId, ingestionId)
    if (!ingestion) skipWith(this, 'the ingestion did not reach a terminal state within the poll window')

    expectField(ingestion, 'status', 'string')
    expect(String(ingestion.status).toLowerCase()).to.not.equal('failed')
    expect(ingestion.id, 'the detail is keyed by id, not ingestionId').to.equal(ingestionId)

    // The detail response must carry at least what a list row carries. It used to return only
    // ingestionId + status, because the API read the ingest through its V1 contract — fixed in
    // ingestion-api (GetIngestion now reads account-service directly).
    expectField(ingestion, 'initiatedAt', 'string')
    expectKey(ingestion, 'initiatedBy')

    // Both are null when the run reported nothing, but the keys are always there.
    expectKey(ingestion, 'summary')
    expectKey(ingestion, 'errors')
    const summary = ingestion.summary as {ingestion: {receivedRecordCount: number} | null} | null
    if (summary?.ingestion) {
      expect(summary.ingestion.receivedRecordCount, 'summary.ingestion.receivedRecordCount').to.equal(DEFAULT_RECORDS.length)
    } else {
      console.log('   note: the ingestion reported no summary counts')
    }

    const listed = json<Array<{duration: null | number; id: string; initiatedAt: null | string}>>(
      await cli(['dataset', 'ingestions', datasetId, '--json']),
    ).find(item => item.id === ingestionId)

    expect(listed, 'the ingestion should still be listed').to.not.equal(undefined)
    expect(ingestion.initiatedAt, 'initiatedAt should agree with the list row').to.equal(listed!.initiatedAt)
    expect(ingestion.duration, 'duration should agree with the list row').to.equal(listed!.duration)
  })

  it('reports ingestion statistics', async () => {
    const statistics = json<Record<string, unknown>>(await cli(['dataset', 'ingestion-statistics', datasetId, '--json']))
    expect(statistics).to.be.an('object')
  })

  it('returns the ingested rows', async function () {
    this.timeout(120_000)
    if (!ingestionId) skipWith(this, 'no ingestion was started')

    const probe = await cli(['dataset', 'data', datasetId, '--page-size', '50', '--json'])
    const outage = serviceUnavailable(probe)
    if (outage) {
      skipWith(this, `${outage}`)
    }

    await retryRead(
      async () => {
        // --json is the whole response: the rows sit beside the schema that describes them.
        const data = json<{items: Array<Record<string, unknown>> | null; lastUpdatedAt: null | string; schema: null | unknown[]}>(
          await cli(['dataset', 'data', datasetId, '--page-size', '50', '--json']),
        )

        expectKey(data, 'schema')
        expectKey(data, 'lastUpdatedAt')
        const rows = data.items ?? []
        if (rows.length === 0) throw new Error('no rows returned yet')
        expectKey(rows[0], 'id')
        expectKey(rows[0], 'name')
      },
      {attempts: 10, delayMs: 5000},
    )
  })

  it('lists the sync frequency options', async () => {
    // Unwrapped from {items} to a bare array, like every other list.
    const options = json<Array<{availability: string; isDefault: boolean; isSelected: boolean; label: string; syncInterval: number}>>(
      await cli(['dataset', 'sync-frequency-options', datasetId, '--json']),
    )
    expect(options).to.be.an('array').that.is.not.empty
    expectField(options[0], 'syncInterval', 'number')
    expectField(options[0], 'label', 'string')
    expectField(options[0], 'isDefault', 'boolean')
    expectField(options[0], 'isSelected', 'boolean')
    expectField(options[0], 'availability', 'string')

    const table = expectOk(await cli(['dataset', 'sync-frequency-options', datasetId]))
    expect(table.stdout).to.include('Interval (min)')
    expect(table.stdout).to.include('Availability')
  })

  it('sets the sync frequency and returns the updated dataset', async () => {
    const table = expectOk(await cliWithRetry(['dataset', 'set-sync-frequency', datasetId, '--interval', '1440']))
    expect(table.stdout).to.include('1440 minutes')

    const updated = json<DatasetDetail>(
      await cliWithRetry(['dataset', 'set-sync-frequency', datasetId, '--interval', '1440', '--json']),
    )
    expect(String(updated.id)).to.equal(datasetId)
    expectField(updated, 'columnCount', 'number')
    expect(updated.syncInterval, 'the detail reports the interval just set').to.equal(1440)
  })

  it('sets a timezone the organization supports and returns the updated dataset', async () => {
    const timezones = json<Array<{timezone: string}>>(await cli(['organization', 'timezones', '--json']))
    // Pick a zone the fixture is not already in, so the call has to change something.
    const current = json<DatasetDetail>(await cli(['dataset', 'get', datasetId, '--json'])).timezone
    const {timezone} = timezones.find(zone => zone.timezone !== current) ?? timezones[0]

    const result = expectOk(await cliWithRetry(['dataset', 'set-timezone', datasetId, '--timezone', timezone]))
    expect(result.stdout).to.include(timezone)

    const updated = json<DatasetDetail>(
      await cliWithRetry(['dataset', 'set-timezone', datasetId, '--timezone', timezone, '--json']),
    )
    expect(String(updated.id)).to.equal(datasetId)
    expectField(updated, 'columnCount', 'number')
    expect(updated.timezone).to.equal(timezone)

    const reread = json<DatasetDetail>(await cli(['dataset', 'get', datasetId, '--json']))
    expect(reread.timezone).to.equal(timezone)
  })

  it('returns sync history', async () => {
    const history = json<Array<Record<string, unknown>>>(await cli(['dataset', 'sync-history', datasetId, '--json']))
    expect(history).to.be.an('array')

    // A pushed dataset may never have synced; check the row shape only when there is one.
    if (history.length > 0) {
      for (const key of ['id', 'initiatedAt', 'status', 'type', 'duration', 'error']) expectKey(history[0], key)
    }
  })

  it('returns sync statistics', async () => {
    const statistics = json<Record<string, unknown>>(await cli(['dataset', 'sync-statistics', datasetId, '--json']))
    expect(statistics).to.be.an('object')
  })

  it('returns lineage with string node ids', async () => {
    const lineage = json<{children: LineageNode[]; id: number; parents: LineageNode[]}>(
      await cli(['dataset', 'lineage', datasetId, '--json']),
    )

    // The dataset's own id is a number; a node's is a string, because a metric's id is its key.
    expectField(lineage, 'id', 'number')
    expect(String(lineage.id)).to.equal(datasetId)
    expect(lineage.parents).to.be.an('array')
    expect(lineage.children).to.be.an('array')

    for (const node of [...lineage.parents, ...lineage.children]) {
      expectField(node, 'id', 'string')
      expect(LINEAGE_TYPES, `lineage node ${node.id} type`).to.include(node.type)
      expect(node, `lineage node ${node.id}`).to.not.have.property('datasetType')
    }

    const table = expectOk(await cli(['dataset', 'lineage', datasetId]))
    if (lineage.parents.length + lineage.children.length > 0) {
      expect(table.stdout).to.include('Relation')
    }
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

  // The fixture is this suite's own, created and deleted here, so it needs no withRestore: the
  // undo log is for resources the suite does not own, and an entry for a deleted fixture could
  // never be replayed. It is still put back, so the tests after this one read the usual state.
  it('round-trips the private access level', async () => {
    const original = json<Permissions>(await cli(['dataset', 'permissions', datasetId, '--json']))

    const updated = json<Permissions>(
      await cliWithRetry(['dataset', 'set-permissions', datasetId, '--access-level', 'private', '--json']),
    )
    expect(updated.accessLevel).to.equal('private')
    expect(updated.accessList).to.equal(null)

    const reread = json<Permissions>(await cli(['dataset', 'permissions', datasetId, '--json']))
    expect(reread.accessLevel).to.equal('private')

    const restoreArgv = ['dataset', 'set-permissions', datasetId, '--access-level', original.accessLevel, '--json']
    for (const user of original.accessList ?? []) restoreArgv.push('--access-list', String(user.id))
    const restored = json<Permissions>(await cliWithRetry(restoreArgv))
    expect(restored.accessLevel).to.equal(original.accessLevel)
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
    expect(errorText(result)).to.include('must be a numeric value')
  })

  // The unit harness refuses an empty flag value; the real binary passes it through. An empty
  // --schema used to be dropped, creating a dataset with no schema.
  it('rejects an empty --schema as invalid JSON with exit 2', async () => {
    const result = await cli([
      'dataset', 'create', '--name', e2eName('empty-schema'), '--data-source-id', dataSourceId, '--schema', '', '--json',
    ])
    // A regression creates a dataset; tracked, teardown removes it.
    if (result.code === 0) tracker.track('dataset', json<{id: number}>(result).id)

    expectExit(result, 2)
    expect(errorText(result)).to.include('Invalid JSON for --schema')
  })

  it('rejects an empty --name with exit 2', async () => {
    const result = await cli(['dataset', 'create', '--name', '', '--data-source-id', dataSourceId, '--json'])
    // A regression sends it; should the API accept it, teardown removes what it created.
    if (result.code === 0) tracker.track('dataset', json<{id: number}>(result).id)

    expectExit(result, 2)
    expect(errorText(result)).to.include('--name cannot be empty')
  })

  it('deletes the dataset', async () => {
    const result = expectOk(await cli(['dataset', 'delete', datasetId, '--force']))
    expect(result.stdout).to.include(`${datasetId} deleted.`)

    tracker.forget('dataset', datasetId)
  })
})
