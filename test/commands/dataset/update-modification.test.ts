import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, modification} from './fixtures.js'

// The request is DatasetModificationRequest: every key is keyed by column id, and a filter is
// {logicalOperator, conditions[{type, value}]} — not the old filters array or `rules`.
const definition = {
  dataTypes: {amount: {outputLogicalType: 'currency'}},
  displayNames: {amount: 'Revenue'},
  filters: {amount: {conditions: [{type: 'greater_than', value: 100}], logicalOperator: 'AND'}},
  formulas: {totalWithTax: '$amount * 1.2'},
  order: ['orderId', 'amount'],
  visibility: {orderId: false},
}

describe('dataset update-modification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/modifications', response: envelope(modification)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints the saved definition as the modifications table', async () => {
    const {stdout} = await runCommand(['dataset', 'update-modification', '123', '--data', JSON.stringify(definition)], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Column.+Display Name.+Visible.+Formula.+Filter.+Type/)
    expect(lines.slice(2)).to.have.length(3)
    expect(lines[3]).to.include('Revenue')
    expect(lines[3]).to.include('greater_than 100 AND is_not_null')
  })

  it('sends the definition as given', async () => {
    await runCommand(['dataset', 'update-modification', '123', '--data', JSON.stringify(definition)], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/modifications')).to.deep.equal(definition)
  })

  it('outputs the saved definition with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'update-modification', '123', '--data', JSON.stringify(definition), '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(modification)
  })

  it('names the real keys when --data is not JSON', async () => {
    const {error} = await runCommand(['dataset', 'update-modification', '123', '--data', '{nope'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('logicalOperator')
    expect(error?.message).to.not.contain('columnFilters')
  })
})
