import {expect} from 'chai'

import {
  CliResult, cli, errorText, expectExit, expectOk, json,
} from './helpers/cli.js'
import {
  DEFAULT_SCHEMA, ResourceTracker, createDataSource, createDataset,
} from './helpers/resources.js'

/**
 * A 400 from the API's own validation: exit 1 (an API error, not a CLI usage error), with the
 * message and the field it names, as the CLI renders them.
 */
function expectValidationError(result: CliResult, message: RegExp, field: string): void {
  expectExit(result, 1)
  const text = errorText(result)
  expect(text).to.match(message)
  expect(text).to.include(`Field: ${field}`)
}

describe('dataset-metadata', () => {
  const tracker = new ResourceTracker()
  let datasetId: string

  before(async function () {
    this.timeout(120_000)

    const dataSource = await createDataSource(tracker, 'meta-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'meta'})
    datasetId = dataset.id
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('reads dataset metadata', async () => {
    const metadata = json<Record<string, unknown>>(await cli(['dataset', 'metadata', datasetId, '--json']))
    expect(metadata).to.be.an('object')
    expect(metadata).to.have.all.keys('description', 'synonyms', 'defaultTimeDimension')
  })

  it('sets a description and reads it back', async () => {
    const description = 'Set by the databox-cli e2e suite.'
    expectOk(await cli(['dataset', 'set-metadata', datasetId, '--description', description, '--json']))

    const reread = json<{description?: string}>(await cli(['dataset', 'metadata', datasetId, '--json']))
    expect(reread.description).to.equal(description)
  })

  it('sets synonyms and reads them back', async () => {
    const synonyms = ['cli-e2e', 'automated']
    expectOk(await cli(['dataset', 'set-metadata', datasetId, '--synonyms', JSON.stringify(synonyms), '--json']))

    const reread = json<{synonyms?: string[]}>(await cli(['dataset', 'metadata', datasetId, '--json']))
    expect(reread.synonyms ?? []).to.include.members(synonyms)
  })

  it('sets a datetime column as the default time dimension', async () => {
    const dateColumn = DEFAULT_SCHEMA.find(column => column.dataType === 'datetime')!.id

    const updated = json<{defaultTimeDimension: null | string}>(
      await cli(['dataset', 'set-metadata', datasetId, '--default-time-dimension', dateColumn, '--json']),
    )
    expect(updated.defaultTimeDimension).to.equal(dateColumn)
  })

  it('rejects a default time dimension that is not a datetime column', async () => {
    const textColumn = DEFAULT_SCHEMA.find(column => column.dataType === 'string')!.id
    const result = await cli(['dataset', 'set-metadata', datasetId, '--default-time-dimension', textColumn])

    expectValidationError(result, /not a datetime column/i, 'defaultTimeDimension')
  })

  it('rejects a default time dimension that is not in the schema', async () => {
    const result = await cli(['dataset', 'set-metadata', datasetId, '--default-time-dimension', 'no_such_column'])

    expectValidationError(result, /does not exist in the dataset schema/i, 'defaultTimeDimension')
  })

  it('rejects malformed JSON in --synonyms with exit 2', async () => {
    const result = await cli(['dataset', 'set-metadata', datasetId, '--synonyms', '[not json'])

    expectExit(result, 2)
    expect(errorText(result)).to.match(/json/i)
  })

  it('reads column metadata', async () => {
    // Unwrapped from {items} to a bare array; each column is keyed by `id`, not `columnId`.
    const columns = json<Array<Record<string, unknown>>>(await cli(['dataset', 'column-metadata', datasetId, '--json']))
    expect(columns).to.be.an('array').that.is.not.empty
    expect(columns[0]).to.have.all.keys('id', 'displayName', 'description', 'conceptType', 'synonyms')
    expect(DEFAULT_SCHEMA.map(column => column.id)).to.include.members(columns.map(column => column.id))

    // Table mode is a separate path through formatOutput and used to throw here.
    const table = expectOk(await cli(['dataset', 'column-metadata', datasetId]))
    for (const header of ['Column ID', 'Concept Type', 'Synonyms']) expect(table.stdout).to.include(header)
  })

  it('sets column metadata, returns the updated columns, and reads them back', async () => {
    const {id} = DEFAULT_SCHEMA[1]
    const columns = [{
      conceptType: 'dimension', description: 'Set by the e2e suite', id, synonyms: ['cli-e2e'],
    }]

    // The response is the dataset's column metadata after the update, as a bare array.
    const returned = json<Array<{conceptType: null | string; description: null | string; id: string; synonyms: null | string[]}>>(
      await cli(['dataset', 'set-column-metadata', datasetId, '--columns', JSON.stringify(columns), '--json']),
    )
    expect(returned.find(column => column.id === id)?.description).to.equal('Set by the e2e suite')

    const reread = json<Array<{conceptType: null | string; description: null | string; id: string; synonyms: null | string[]}>>(
      await cli(['dataset', 'column-metadata', datasetId, '--json']),
    )

    const updated = reread.find(column => column.id === id)
    expect(updated, `column "${id}" missing from column-metadata`).to.not.equal(undefined)
    expect(updated!.description).to.equal('Set by the e2e suite')
    expect(updated!.conceptType).to.equal('dimension')
    expect(updated!.synonyms ?? []).to.include('cli-e2e')
  })

  it('rejects an unknown concept type', async () => {
    const columns = [{conceptType: 'metric', id: DEFAULT_SCHEMA[1].id}]
    const result = await cli(['dataset', 'set-column-metadata', datasetId, '--columns', JSON.stringify(columns)])

    expectValidationError(result, /invalid concept type/i, 'columns[0].conceptType')
  })

  it('rejects a column that is not in the schema', async () => {
    const columns = [{description: 'irrelevant', id: 'no_such_column'}]
    const result = await cli(['dataset', 'set-column-metadata', datasetId, '--columns', JSON.stringify(columns)])

    expectValidationError(result, /does not exist in the dataset schema/i, 'columns[0].id')
  })

  it('rejects malformed JSON in --columns with exit 2', async () => {
    const result = await cli(['dataset', 'set-column-metadata', datasetId, '--columns', '{oops'])

    expectExit(result, 2)
    expect(errorText(result)).to.match(/json/i)
  })

  // DatasetService.ValidateColumnMetadata rejects an empty columns list; the CLI refuses it first.
  it('rejects an empty --columns array with exit 2 before calling the API', async () => {
    const result = await cli(['dataset', 'set-column-metadata', datasetId, '--columns', '[]'])

    expectExit(result, 2)
    expect(errorText(result)).to.include('At least one column must be provided')
  })
})
