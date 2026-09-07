import {expect} from 'chai'

import {
  cli, expectExit, expectOk, json,
} from './helpers/cli.js'
import {
  DEFAULT_SCHEMA, ResourceTracker, createDataSource, createDataset,
} from './helpers/resources.js'

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

  it('rejects malformed JSON in --synonyms with exit 2', async () => {
    const result = await cli(['dataset', 'set-metadata', datasetId, '--synonyms', '[not json'])

    expectExit(result, 2)
    expect(result.stderr).to.match(/json/i)
  })

  it('reads column metadata', async () => {
    const columns = json<Array<{columnId: string}>>(await cli(['dataset', 'column-metadata', datasetId, '--json']))
    expect(columns).to.be.an('array').that.is.not.empty

    // Table mode is a separate path through formatOutput and used to throw here.
    const table = expectOk(await cli(['dataset', 'column-metadata', datasetId]))
    expect(table.stdout).to.include('Column ID')
  })

  it('sets column metadata and reads it back', async () => {
    const {columnId} = DEFAULT_SCHEMA[1]
    const columns = [{columnId, description: 'Set by the e2e suite'}]

    expectOk(await cli(['dataset', 'set-column-metadata', datasetId, '--columns', JSON.stringify(columns), '--json']))

    const reread = json<Array<{columnId: string; description?: string}>>(
      await cli(['dataset', 'column-metadata', datasetId, '--json']),
    )

    const updated = reread.find(column => column.columnId === columnId)
    expect(updated, `column "${columnId}" missing from column-metadata`).to.not.equal(undefined)
    expect(updated!.description).to.equal('Set by the e2e suite')
  })

  it('rejects malformed JSON in --columns with exit 2', async () => {
    const result = await cli(['dataset', 'set-column-metadata', datasetId, '--columns', '{oops'])

    expectExit(result, 2)
    expect(result.stderr).to.match(/json/i)
  })
})
