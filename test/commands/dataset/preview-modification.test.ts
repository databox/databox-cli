import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, schemaColumns} from './fixtures.js'

const DATA = '{"filters":{"amount":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}'

const preview = {
  items: [{amount: 150, note: 'secret', orderDate: '2026-09-01'}],
  pagination: {totalItems: 5000},
  schema: schemaColumns,
}

describe('dataset preview-modification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets/123/modifications/preview', response: envelope(preview)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('renders the sample rows and how many matched', async () => {
    const {stdout} = await runCommand(['dataset', 'preview-modification', '123', '--data', DATA], {root: process.cwd()})
    expect(stdout).to.include('Order date')
    expect(stdout).to.include('150')
    expect(stdout).to.not.include('secret')
    expect(stdout).to.include('5000 rows matched (showing up to 200).')
  })

  it('outputs the whole response with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'preview-modification', '123', '--data', DATA, '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(preview)
  })

  it('sends the definition as the body', async () => {
    await runCommand(['dataset', 'preview-modification', '123', '--data', DATA], {root: process.cwd()})
    expect(lastBody('POST', '/v2/datasets/123/modifications/preview')).to.deep.equal(JSON.parse(DATA))
  })

  // The route takes sortBy and sortOrder only: no page or pageSize.
  it('sends sort, and no page parameters', async () => {
    await runCommand(['dataset', 'preview-modification', '123', '--data', DATA, '--sort-by', 'amount', '--sort-order', 'desc'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?sortBy=amount&sortOrder=desc')
  })

  it('does not accept --page', async () => {
    const {error} = await runCommand(['dataset', 'preview-modification', '123', '--data', DATA, '--page', '1'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
  })
})
