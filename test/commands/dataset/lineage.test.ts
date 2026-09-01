import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset lineage', () => {
  beforeEach(() => { setupTestConfig() })
  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('shows lineage for a dataset', async () => {
    mockApi([{method: 'GET', path: '/v2/datasets/123/lineage', response: {status: 'success', requestId: 'test', data: {id: 123, parents: [{id: 100, title: 'Parent DS', type: 'DataSource', datasetType: null}], children: []}}}])
    const {stdout} = await runCommand(['dataset', 'lineage', '123'])
    expect(stdout).to.include('123')
  })

  it('outputs JSON with --json', async () => {
    mockApi([{method: 'GET', path: '/v2/datasets/123/lineage', response: {status: 'success', requestId: 'test', data: {id: 123, parents: [], children: []}}}])
    const {stdout} = await runCommand(['dataset', 'lineage', '123', '--json'])
    const json = JSON.parse(stdout)
    expect(json.id).to.equal(123)
  })
})
