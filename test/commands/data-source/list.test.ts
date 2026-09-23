import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceListItem} from './fixtures.js'

const unconnected = {
  ...dataSourceListItem,
  connectionId: null,
  id: 43,
  lastActivityAt: null,
  name: 'Pushed',
  statusInfo: {
    description: null, errorType: null, reason: null, status: 'active', statusCode: 'active', userAction: null,
  },
}

describe('data-source list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: envelope({items: [dataSourceListItem, unconnected], pagination: {page: 0, pageSize: 25, totalItems: 2}}),
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('renders the status and last activity columns', async () => {
    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})
    // Header, rule, then one line per data source; cells are separated by │.
    const [header, , ...rows] = stdout.trim().split('\n').slice(0, 4).map(line => line.split('│').map(cell => cell.trim()))
    expect(header).to.deep.equal(['ID', 'Name', 'Integration', 'Timezone', 'Connection ID', 'Status', 'Last activity'])
    expect(rows).to.deep.equal([
      ['42', 'My Source', 'DataboxAPI', 'UTC', '7', 'error', '2026-09-01T08:00:00+00:00'],
      ['43', 'Pushed', 'DataboxAPI', 'UTC', '', 'active', ''],
    ])
  })

  it('passes the items through whole with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal([dataSourceListItem, unconnected])
  })

  it('sends a sort the API knows', async () => {
    await runCommand(['data-source', 'list', '--sort-by', 'lastActivityAt', '--sort-order', 'desc'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?sortBy=lastActivityAt&sortOrder=desc')
  })

  it('rejects a sort field the API does not know with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'list', '--sort-by', 'title'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
