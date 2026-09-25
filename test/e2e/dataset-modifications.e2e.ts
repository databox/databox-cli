import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, serviceUnavailable, skipWith,
} from './helpers/cli.js'
import {csvColumn, parseCsv} from './helpers/csv.js'
import {
  DEFAULT_SCHEMA, ResourceTracker, createDataSource, createDataset, tryIngestRecords, waitForIngestion,
  waitForModificationsSettled,
} from './helpers/resources.js'

/** DatasetResponse.cs `DatasetModificationResponse`, returned by GET and PUT modifications. */
interface Modification {
  dataTypes: Record<string, {inputFormat: null | string; outputFormat: {scale: null | string; type: null | string} | null; outputLogicalType: string}>
  displayNames: Record<string, string>
  filters: Record<string, {conditions: Array<{type: string; value: unknown}>; logicalOperator: string}>
  formulas: Record<string, string>
  order: string[]
  visibility: Record<string, boolean>
}

/** DatasetResponse.cs `ModificationRulesResponse`: only what these tests read. */
interface ModificationRules {
  dataTypeRules: {
    /** Keyed by the column's current physical type. A null input format means none is needed. */
    conversionsByPhysicalType: Record<string, Array<{inputFormats: Array<{id: string} | null>; outputLogicalType: string}>>
    outputFormats: {
      byLogicalType: Record<string, Array<{id: string}>>
      scalableLogicalTypes: string[]
      scaleOptions: Array<{id: string}>
    }
  }
  filterRules: Record<string, string[]>
}

/** Filters on "amount", which is in DEFAULT_SCHEMA. Shape mirrors ingestion-api's e2e script. */
const MODIFICATION = {
  filters: {
    amount: {
      conditions: [{type: 'greater_than', value: 50}],
      logicalOperator: 'AND',
    },
  },
}

const PREVIEW_MODIFICATION = {
  filters: {
    amount: {
      conditions: [{type: 'greater_than', value: 100}],
      logicalOperator: 'AND',
    },
  },
}

const RENAMED = 'Revenue'
const RENAME = {displayNames: {amount: RENAMED}}

/**
 * For update-modification and clear-modifications. Each save locks the dataset while
 * account-service re-prepares it, and a write that lands inside that window is refused (423,
 * or a 500) and reported as an internal_error, which is a transient pattern. The suite waits
 * for the settled state after every save, so this only covers a lock that outlives that wait;
 * a failure that persists past the last attempt is still returned, and fails the test.
 */
const LOCKED_WRITE = {attempts: 6, delayMs: 10_000}

describe('dataset-modifications', () => {
  const tracker = new ResourceTracker()
  let datasetId: string
  let hasData = false
  let created = false

  before(async function () {
    this.timeout(180_000)

    const dataSource = await createDataSource(tracker, 'mod-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'mod'})
    datasetId = dataset.id

    // The rename test reads rows back through `dataset data` and the preview, so the fixture
    // needs some.
    const ingested = await tryIngestRecords(datasetId)
    if (ingested.code === 0) {
      const {ingestionId} = JSON.parse(ingested.stdout) as {ingestionId: string}
      const ingestion = await waitForIngestion(datasetId, ingestionId)
      hasData = ingestion !== undefined && String(ingestion.status).toLowerCase() !== 'failed'
      if (ingestion && !hasData) console.log(`   note: fixture ingestion ${ingestionId} failed`)
    } else {
      console.log(`   note: could not ingest fixture data — ${errorText(ingested)}`)
    }
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists the global filter rules and type conversions', async () => {
    const rules = json<ModificationRules>(await cli(['dataset', 'modification-rules', '--json']))

    expectField(rules, 'filterRules', 'object')
    for (const type of ['datetime', 'number', 'string']) {
      expect(rules.filterRules[type], `filterRules.${type}`).to.be.an('array').that.is.not.empty
    }

    expect(rules.filterRules.number).to.include('greater_than')
    expectField(rules, 'dataTypeRules', 'object')
    expectField(rules.dataTypeRules, 'conversionsByPhysicalType', 'object')

    const table = expectOk(await cli(['dataset', 'modification-rules']))
    expect(table.stdout).to.include('Filter operators by column type:')
    expect(table.stdout).to.include('Type conversions by current column type:')
  })

  // Renamed from modification-formulas; the route is /modifications/functions. A plain list, so
  // --json unwraps {items} to a bare array.
  it('lists the formula functions', async () => {
    const functions = json<Array<Record<string, unknown>>>(await cli(['dataset', 'modification-functions', '--json']))

    expect(functions).to.be.an('array').that.is.not.empty
    expectField(functions[0], 'name', 'string')
    expectField(functions[0], 'signature', 'string')
    expectField(functions[0], 'description', 'string')
    expect(functions[0].parameters).to.be.an('array')
    expectKey(functions[0], 'example')

    const table = expectOk(await cli(['dataset', 'modification-functions']))
    expect(table.stdout).to.include('Signature')
  })

  it('reads an empty definition, as an object, before anything is saved', async () => {
    const modification = json<Modification>(await cli(['dataset', 'modifications', datasetId, '--json']))

    // Empty maps, never null; order and visibility describe every column even with nothing saved.
    for (const key of ['filters', 'formulas', 'displayNames', 'dataTypes'] as const) {
      expect(modification[key], key).to.deep.equal({})
    }

    expect([...modification.order].sort()).to.deep.equal(DEFAULT_SCHEMA.map(column => column.id).sort())
    for (const {id} of DEFAULT_SCHEMA) expect(modification.visibility[id], `visibility.${id}`).to.equal(true)

    // Table mode is one row per column. It used to crash, reading the object as a list.
    const table = expectOk(await cli(['dataset', 'modifications', datasetId]))
    expect(table.stdout).to.include('Display Name')
    for (const {id} of DEFAULT_SCHEMA) expect(table.stdout).to.include(id)
  })

  it('saves a modification with update-modification', async function () {
    this.timeout(300_000)

    const result = await cliWithRetry([
      'dataset',
      'update-modification',
      datasetId,
      '--data',
      JSON.stringify(MODIFICATION),
      '--json',
    ], LOCKED_WRITE)

    const outage = serviceUnavailable(result)
    if (outage) {
      skipWith(this, `${outage}`)
    }

    // The response is the saved definition.
    const saved = json<Modification>(result)
    expect(saved.filters.amount?.conditions?.[0]?.type).to.equal('greater_than')
    created = true

    await waitForModificationsSettled(datasetId)
  })

  it('reads the modification back', async function () {
    this.timeout(300_000)

    if (!created) {
      skipWith(this, 'no modification was saved')
    }

    // Read right after a save, order is still empty while the dataset re-prepares.
    const modification = await waitForModificationsSettled<Modification>(datasetId)
    expect(modification.filters.amount?.logicalOperator).to.equal('AND')
    expect(modification.filters.amount?.conditions?.[0]).to.deep.equal({type: 'greater_than', value: 50})
    expect(modification.order).to.have.lengthOf(DEFAULT_SCHEMA.length)

    const table = expectOk(await cli(['dataset', 'modifications', datasetId]))
    expect(table.stdout).to.include('greater_than 50')
  })

  it('previews a modification without saving it', async function () {
    const result = await cliWithRetry([
      'dataset',
      'preview-modification',
      datasetId,
      '--data',
      JSON.stringify(PREVIEW_MODIFICATION),
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      skipWith(this, `${outage}`)
    }

    // --json is the whole response: rows beside their schema and the matched total.
    const preview = json<{items: null | unknown[]; pagination: {totalItems: number}; schema: null | unknown[]}>(result)
    expectKey(preview, 'items')
    expectKey(preview, 'schema')
    expectField(preview, 'pagination', 'object')
    expectField(preview.pagination, 'totalItems', 'number')

    const table = expectOk(await cliWithRetry([
      'dataset', 'preview-modification', datasetId, '--data', JSON.stringify(PREVIEW_MODIFICATION),
    ]))
    expect(table.stdout).to.match(/\d+ rows matched \(showing up to 200\)/)
  })

  it('round-trips a data type copied from the rules', async function () {
    this.timeout(300_000)

    if (!created) {
      skipWith(this, 'no modification was saved')
    }

    // The rules are keyed by physical type (int64, decimal, string, datetime), not by the schema's
    // "number". The fixture's fractional amounts should make "amount" decimal, but that is the
    // engine's inference, so fall back to int64, then to any type that converts to currency. The
    // conversion has to need no input format, since this sends none.
    const rules = json<ModificationRules>(await cli(['dataset', 'modification-rules', '--json']))
    const {conversionsByPhysicalType, outputFormats} = rules.dataTypeRules
    const physicalTypes = Object.keys(conversionsByPhysicalType)
    const physicalType = ['decimal', 'int64', ...physicalTypes].find(type =>
      conversionsByPhysicalType[type]?.some(item => item.outputLogicalType === 'currency'))
    if (physicalType === undefined) {
      skipWith(this, `the rules offer no conversion to currency for any physical type; keys are ${JSON.stringify(physicalTypes)}`)
    }

    const conversion = conversionsByPhysicalType[physicalType].find(item => item.outputLogicalType === 'currency')!
    expect(
      conversion.inputFormats.length === 0 || conversion.inputFormats.includes(null),
      `${physicalType}-to-currency needs an input format: ${JSON.stringify(conversion.inputFormats)}`,
    ).to.equal(true)

    const formatType = outputFormats.byLogicalType.currency?.[0]?.id
    expect(formatType, 'the rules should offer an output format for currency').to.be.a('string')

    // A scale applies only to the logical types the rules call scalable.
    const scale = outputFormats.scalableLogicalTypes.includes('currency') ? (outputFormats.scaleOptions[0]?.id ?? null) : null

    const dataTypes = {
      amount: {inputFormat: null, outputFormat: {scale, type: formatType}, outputLogicalType: 'currency'},
    }

    const saved = json<Modification>(await cliWithRetry(
      ['dataset', 'update-modification', datasetId, '--data', JSON.stringify({dataTypes}), '--json'],
      LOCKED_WRITE,
    ))
    expect(saved.dataTypes.amount?.outputLogicalType).to.equal('currency')
    expect(saved.dataTypes.amount?.outputFormat?.type).to.equal(formatType)

    // A save replaces the whole definition, so the filter from before is gone.
    expect(saved.filters).to.deep.equal({})

    const reread = await waitForModificationsSettled<Modification>(datasetId)
    expect(reread.dataTypes.amount?.outputLogicalType).to.equal('currency')
    expect(reread.dataTypes.amount?.outputFormat).to.deep.equal({scale, type: formatType})

    const table = expectOk(await cli(['dataset', 'modifications', datasetId]))
    expect(table.stdout).to.include('currency')
  })

  // Settles how the row endpoints key a renamed column. src/lib/dataset-rows.ts reads each cell
  // as row[schema.id] and heads it with schema.displayName; if the API keyed rows by display name
  // instead, the renamed column would render with a header and no values.
  it('still shows a renamed column\'s values in dataset data and the preview', async function () {
    this.timeout(300_000)

    if (!created) {
      skipWith(this, 'no modification was saved')
    }

    if (!hasData) {
      skipWith(this, 'fixture dataset has no ingested data to read back')
    }

    const saved = json<Modification>(await cliWithRetry(
      ['dataset', 'update-modification', datasetId, '--data', JSON.stringify(RENAME), '--json'],
      LOCKED_WRITE,
    ))
    expect(saved.displayNames.amount).to.equal(RENAMED)

    await waitForModificationsSettled(datasetId)
    const modifications = expectOk(await cli(['dataset', 'modifications', datasetId]))
    expect(modifications.stdout).to.include(RENAMED)

    // Saving re-prepares the dataset; the renamed schema lands a few seconds later.
    const amounts = await retryRead(
      async () => {
        const rows = parseCsv(expectOk(await cli(['dataset', 'data', datasetId, '--output', 'csv'])).stdout)
        const cells = csvColumn(rows, RENAMED)
        if (cells.length === 0) throw new Error('no rows returned yet')
        return cells
      },
      {attempts: 10, delayMs: 3000},
    )

    expect(amounts.every(cell => cell !== ''), `"${RENAMED}" cells in dataset data: ${JSON.stringify(amounts)}`).to.equal(true)

    const preview = parseCsv(expectOk(await cliWithRetry([
      'dataset', 'preview-modification', datasetId, '--data', JSON.stringify(RENAME), '--output', 'csv',
    ])).stdout)
    const previewAmounts = csvColumn(preview, RENAMED)

    expect(previewAmounts, 'preview returned no rows').to.not.be.empty
    expect(previewAmounts.every(cell => cell !== ''), `"${RENAMED}" cells in the preview: ${JSON.stringify(previewAmounts)}`).to.equal(true)
  })

  it('rejects malformed JSON in --data with exit 2', async () => {
    const result = await cli(['dataset', 'update-modification', datasetId, '--data', '{nope'])

    expectExit(result, 2)
    expect(errorText(result)).to.match(/json/i)
  })

  it('clears the modifications', async function () {
    this.timeout(300_000)

    if (!created) {
      skipWith(this, 'no modification was saved')
    }

    expectOk(await cliWithRetry(['dataset', 'clear-modifications', datasetId, '--force'], LOCKED_WRITE))

    const after = await waitForModificationsSettled<Modification>(datasetId)
    expect(after.displayNames).to.deep.equal({})
    expect(after.dataTypes).to.deep.equal({})
  })
})
