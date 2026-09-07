import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: {
          data: {
            items: [{
              datasetType: 'ingestion', id: 123, ingestionInfo: null, name: 'My Dataset', parentDataSourceId: 42, statusInfo: {status: 'active'}, timezone: null, verificationInfo: {isVerified: false},
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

  it('lists datasets', async () => {
    const {stdout} = await runCommand(['dataset', 'list'], {root: process.cwd()})
    expect(stdout).to.include('My Dataset')
    expect(stdout).to.include('123')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
