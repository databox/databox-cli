import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('data-source list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources',
        response: {
          data: {
            items: [{
              connectionId: null, createdAt: '2024-01-01', id: 42, integrationKey: 'Datadoo', lastActivityAt: null, name: 'My Source', statusInfo: {status: 'active'}, timezone: 'UTC',
            }],
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

  it('lists data sources', async () => {
    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})
    expect(stdout).to.include('My Source')
    expect(stdout).to.include('42')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0].id).to.equal(42)
  })
})
