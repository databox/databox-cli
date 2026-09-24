import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetDetail, envelope} from './fixtures.js'

describe('dataset create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets', response: envelope(datasetDetail)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--name', 'Orders', '--data-source-id', '42'], {root: process.cwd()})
    expect(stdout).to.contain('Orders')
    expect(stdout).to.contain('123')
  })

  it('sends dataSourceId as an integer', async () => {
    await runCommand(['dataset', 'create', '--name', 'Orders', '--data-source-id', '42'], {root: process.cwd()})
    expect(lastBody('POST', '/v2/datasets')).to.deep.equal({dataSourceId: 42, name: 'Orders'})
  })

  for (const value of ['abc', '0']) {
    it(`rejects --data-source-id ${value} with exit 2 and sends nothing`, async () => {
      const {error} = await runCommand(['dataset', 'create', '--name', 'Orders', '--data-source-id', value], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.length(0)
    })
  }

  it('outputs the created dataset with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--name', 'Orders', '--data-source-id', '42', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(datasetDetail)
  })

  // CreateDatasetSchemaColumn is {id, dataType}; `columnId` was rejected with a 400.
  it('sends schema columns as {id, dataType}', async () => {
    await runCommand([
      'dataset', 'create', '--name', 'Orders', '--data-source-id', '42', '--primary-key', 'order_id',
      '--schema', '[{"id":"order_id","dataType":"string"},{"id":"amount","dataType":"number"}]',
    ], {root: process.cwd()})

    expect(lastBody('POST', '/v2/datasets')).to.deep.equal({
      dataSourceId: 42,
      name: 'Orders',
      primaryKey: ['order_id'],
      schema: [{dataType: 'string', id: 'order_id'}, {dataType: 'number', id: 'amount'}],
    })
  })

  it('names the expected schema shape when --schema is not JSON', async () => {
    const {error} = await runCommand(['dataset', 'create', '--name', 'Orders', '--data-source-id', '42', '--schema', '{nope'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('"id"')
    expect(error?.message).to.not.contain('columnId')
  })
})
