import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetListItem, envelope} from '../dataset/fixtures.js'

/** An ingestion dataset and a synced one, so the Ingestion column shows both values. */
const items = [datasetListItem, {
  ...datasetListItem, id: 124, ingestionSupported: false, name: 'Synced',
}]

describe('data-source datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: envelope({items, pagination: {page: 0, pageSize: 25, totalItems: 2}}),
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists datasets for data source', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42'], {root: process.cwd()})
    expect(stdout).to.contain('Orders')
    expect(stdout).to.contain('Sync Status')
    expect(stdout).to.contain('success')
  })

  it('shows the status and whether the dataset takes ingestion', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42'], {root: process.cwd()})
    // Header, rule, then one line per row; cells are separated by │.
    const [header, , ...rows] = stdout.trim().split('\n').slice(0, 4).map(line => line.split('│').map(cell => cell.trim()))
    const ingestion = header.indexOf('Ingestion')
    const status = header.indexOf('Status')
    expect(rows.map(row => row[ingestion])).to.deep.equal(['yes', 'no'])
    expect(rows.map(row => row[status])).to.deep.equal(['active', 'active'])
  })

  it('outputs a bare array with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })

  it('sends the data source, search and sort in the query', async () => {
    await runCommand([
      'data-source', 'datasets', '42', '--search', 'ord', '--sort-by', 'name', '--sort-order', 'asc',
    ], {root: process.cwd()})

    const params = new URLSearchParams(requests()[0].search)
    expect(params.get('dataSourceId')).to.equal('42')
    expect(params.get('search')).to.equal('ord')
    expect(params.get('sortBy')).to.equal('name')
    expect(params.get('sortOrder')).to.equal('asc')
  })

  it('rejects a sort field the API does not accept with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'datasets', '42', '--sort-by', 'id'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
  })
})
