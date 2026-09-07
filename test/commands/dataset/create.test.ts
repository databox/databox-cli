import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/datasets',
        response: {
          data: {
            datasetType: 'ingestion', id: 123, name: 'NewDataset', parentDataSourceId: 1, timezone: null,
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

  it('creates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--name', 'NewDataset', '--data-source-id', '1'], {root: process.cwd()})
    expect(stdout).to.contain('NewDataset')
    expect(stdout).to.contain('123')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--name', 'NewDataset', '--data-source-id', '1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(123)
  })
})
