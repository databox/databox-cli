import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {connectionListItem} from './fixtures.js'

describe('connection list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/connections',
        response: {
          data: {
            items: [connectionListItem],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
          requestId: 'test',
          status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists connections', async () => {
    const {stdout} = await runCommand(['connection', 'list'], {root: process.cwd()})
    expect(stdout).to.include('GA4 Connection')

    // Header, rule, then one line per row; cells are separated by │.
    const [header, , row] = stdout.trim().split('\n').slice(0, 3).map(line => line.split('│').map(cell => cell.trim()))
    expect(row[header.indexOf('Shared')]).to.equal('yes')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal([connectionListItem])
  })
})
