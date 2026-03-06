import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset ingestion', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/datasets/ds-abc/ingestions/ing-1',
        response: {
          ingestionId: 'ing-1',
          timestamp: '2024-01-01T00:00:00Z',
          status: 'completed',
          metrics: {recordsProcessed: 100},
          errors: null,
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets ingestion details', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', 'ds-abc', 'ing-1'], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
    expect(stdout).to.contain('completed')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', 'ds-abc', 'ing-1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.metrics).to.exist
  })
})
