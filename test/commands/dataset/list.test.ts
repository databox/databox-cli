import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset list', () => {
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
            items: [{id: 123, parentDataSourceId: 42, name: 'My Dataset', timezone: null, datasetType: 'ingestion', statusInfo: {status: 'active'}, verificationInfo: {isVerified: false}, ingestionInfo: null}],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

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
