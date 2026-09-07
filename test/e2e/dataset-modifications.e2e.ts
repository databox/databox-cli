import {expect} from 'chai'

import {cli, expectExit, expectField, expectOk, json, serviceUnavailable} from './helpers/cli.js'
import {ResourceTracker, createDataSource, createDataset} from './helpers/resources.js'

/** Filters on "amount", which is in DEFAULT_SCHEMA. Shape mirrors ingestion-api's e2e script. */
const MODIFICATION = {
  columnFilters: {
    amount: {
      filters: [{type: 'greater_than', value: 50}],
      logicalOperator: 'AND',
    },
  },
}

const UPDATED_MODIFICATION = {
  columnFilters: {
    amount: {
      filters: [{type: 'greater_than', value: 100}],
      logicalOperator: 'AND',
    },
  },
}

describe('dataset-modifications', () => {
  const tracker = new ResourceTracker()
  let datasetId: string
  let created = false

  before(async function () {
    this.timeout(120_000)

    const dataSource = await createDataSource(tracker, 'mod-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'mod'})
    datasetId = dataset.id
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists the global filter rules', async () => {
    const rules = json<{filterRules: Record<string, string[]>}>(await cli(['dataset', 'modification-rules', '--json']))

    expectField(rules, 'filterRules', 'object')
    for (const type of ['datetime', 'number', 'string']) {
      expect(rules.filterRules[type], `filterRules.${type}`).to.be.an('array').that.is.not.empty
    }
  })

  // The command uses formatSingle, so it emits the wrapped {items: [...]} rather
  // than a bare array like the other listing commands. Not a defect — the endpoint
  // is a reference lookup, not a paginated list — but worth pinning so the shape
  // does not change unnoticed.
  it('lists the global formulas', async () => {
    const formulas = json<{items: Array<{description: string; name: string; syntax: string}>}>(
      await cli(['dataset', 'modification-formulas', '--json']),
    )

    expect(formulas.items).to.be.an('array').that.is.not.empty
    expectField(formulas.items[0], 'name', 'string')
    expectField(formulas.items[0], 'syntax', 'string')
  })

  it('adds a modification', async function () {
    const result = await cli([
      'dataset',
      'add-modification',
      datasetId,
      '--data',
      JSON.stringify(MODIFICATION),
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    expectOk(result)
    created = true
  })

  it('reads the modification back', async function () {
    if (!created) this.skip()

    const modifications = json<unknown>(await cli(['dataset', 'modifications', datasetId, '--json']))
    expect(modifications).to.not.equal(null)
  })

  it('previews a modification without saving it', async function () {
    const result = await cli([
      'dataset',
      'preview-modification',
      datasetId,
      '--data',
      JSON.stringify(UPDATED_MODIFICATION),
      '--json',
    ])

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    const preview = json<Record<string, unknown>>(result)
    expect(preview).to.be.an('object')
  })

  it('updates the modification', async function () {
    if (!created) this.skip()

    expectOk(
      await cli([
        'dataset',
        'update-modification',
        datasetId,
        '--data',
        JSON.stringify(UPDATED_MODIFICATION),
        '--json',
      ]),
    )
  })

  it('rejects malformed JSON in --data with exit 2', async () => {
    const result = await cli(['dataset', 'add-modification', datasetId, '--data', '{nope'])

    expectExit(result, 2)
    expect(result.stderr).to.match(/JSON/i)
  })

  it('clears the modifications', async function () {
    if (!created) this.skip()

    expectOk(await cli(['dataset', 'clear-modifications', datasetId, '--force']))
  })
})
