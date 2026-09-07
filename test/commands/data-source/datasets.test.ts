import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('data-source datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: {
          data: {
            items: [
              {
                datasetType: 'ingestion',
                id: 100,
                name: 'Linked Dataset',
                parentDataSourceId: 42,
                statusInfo: {status: 'active'},
                timezone: null,
              },
            ],
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
