import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset ingestions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets/123/ingestions',
        response: {
          data: {
            items: [
              {ingestionId: 'ing-1', status: 'completed', timestamp: '2024-01-01T00:00:00Z'},
              {ingestionId: 'ing-2', status: 'failed', timestamp: '2024-01-02T00:00:00Z'},
            ],
            pagination: {
              page: 0,
              pageSize: 10,
              totalItems: 2,
            },
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

  it('lists ingestions', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123'], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
    expect(stdout).to.contain('ing-2')
    expect(stdout).to.contain('completed')
    expect(stdout).to.contain('failed')
  })

  it('shows pagination info', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123'], {root: process.cwd()})
    expect(stdout).to.contain('Page 1 of 1 (2 total items)')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(2)
  })
})
