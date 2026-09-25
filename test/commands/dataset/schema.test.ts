import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, schemaColumns} from './fixtures.js'

function mockSchema(data: Record<string, unknown>): void {
  mockApi([{method: 'GET', path: '/v2/datasets/123/schema', response: envelope(data)}])
}

describe('dataset schema', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows the columns and the primary key', async () => {
    mockSchema({items: schemaColumns, primaryKey: ['orderDate', 'amount']})
    const {stdout} = await runCommand(['dataset', 'schema', '123'], {root: process.cwd()})
    expect(stdout).to.include('orderDate')
    expect(stdout).to.include('Order date')
    expect(stdout).to.include('datetime')
    expect(stdout).to.include('Primary key: orderDate, amount')
  })

  it('shows "none" for an ingestion dataset with no primary key', async () => {
    mockSchema({items: schemaColumns, primaryKey: []})
    const {stdout} = await runCommand(['dataset', 'schema', '123'], {root: process.cwd()})
    expect(stdout).to.include('Primary key: none')
  })

  it('shows "n/a" when the response has no primary key', async () => {
    mockSchema({items: schemaColumns})
    const {stdout} = await runCommand(['dataset', 'schema', '123'], {root: process.cwd()})
    expect(stdout).to.include('Primary key: n/a')
  })

  it('outputs the whole response with --json', async () => {
    const data = {items: schemaColumns, primaryKey: ['orderDate']}
    mockSchema(data)
    const {stdout} = await runCommand(['dataset', 'schema', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(data)
  })

  it('keeps the primary key line out of CSV', async () => {
    mockSchema({items: schemaColumns, primaryKey: ['orderDate']})
    const {stdout} = await runCommand(['dataset', 'schema', '123', '--output', 'csv'], {root: process.cwd()})
    expect(stdout).to.not.include('Primary key')
    expect(stdout.split('\n')[0]).to.equal('ID,Display Name,Data Type,Order,Visible')
  })
})
