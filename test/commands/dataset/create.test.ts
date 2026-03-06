import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v1/datasets',
        response: {
          id: 'ds-new',
          title: 'NewDataset',
          created: '2024-01-01T00:00:00Z',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--title', 'NewDataset', '--data-source-id', '1'], {root: process.cwd()})
    expect(stdout).to.contain('NewDataset')
    expect(stdout).to.contain('ds-new')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'create', '--title', 'NewDataset', '--data-source-id', '1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal('ds-new')
  })
})
