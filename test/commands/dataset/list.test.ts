import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetListItem, envelope} from './fixtures.js'

/** An ingestion dataset and a synced one, so the Ingestion column shows both values. */
const items = [datasetListItem, {
  ...datasetListItem, id: 124, ingestionSupported: false, name: 'Synced',
}]

describe('dataset list', () => {
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

  it('lists datasets with their source, status and last activity', async () => {
    const {stdout} = await runCommand(['dataset', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Orders')
    expect(stdout).to.include('123')
    expect(stdout).to.include('Data Source')
    expect(stdout).to.include('42')
    expect(stdout).to.include('Sync Status')
    expect(stdout).to.include('2026-09-01T08:00:00+00:00')
  })

  it('shows the status and whether the dataset takes ingestion', async () => {
    const {stdout} = await runCommand(['dataset', 'list'], {root: process.cwd()})
    // Header, rule, then one line per row; cells are separated by │.
    const [header, , ...rows] = stdout.trim().split('\n').slice(0, 4).map(line => line.split('│').map(cell => cell.trim()))
    const ingestion = header.indexOf('Ingestion')
    const status = header.indexOf('Status')
    expect(rows.map(row => row[ingestion])).to.deep.equal(['yes', 'no'])
    expect(rows.map(row => row[status])).to.deep.equal(['active', 'active'])
  })

  it('outputs a bare array with --json, items passed through whole', async () => {
    const {stdout} = await runCommand(['dataset', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })

  it('sends search, dataSourceId and sort in the query', async () => {
    await runCommand([
      'dataset', 'list', '--search', 'ord', '--data-source-id', '42', '--sort-by', 'lastActivityAt', '--sort-order', 'desc',
    ], {root: process.cwd()})

    const params = new URLSearchParams(requests()[0].search)
    expect(params.get('search')).to.equal('ord')
    expect(params.get('dataSourceId')).to.equal('42')
    expect(params.get('sortBy')).to.equal('lastActivityAt')
    expect(params.get('sortOrder')).to.equal('desc')
  })

  for (const value of ['abc', '0']) {
    it(`rejects --data-source-id ${value} with exit 2 and sends nothing`, async () => {
      const {error} = await runCommand(['dataset', 'list', '--data-source-id', value], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.length(0)
    })
  }

  it('rejects a sort field the API does not accept with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'list', '--sort-by', 'title'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
