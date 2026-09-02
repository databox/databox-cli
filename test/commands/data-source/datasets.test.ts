import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [
              {
                id: 100,
                title: 'Linked Dataset',
                dataSourceId: 42,
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists datasets for data source', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42'], {root: process.cwd()})
    expect(stdout).to.contain('Linked Dataset')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
