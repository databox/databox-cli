import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset ingestions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/datasets/ds-abc/ingestions',
        response: {
          ingestions: [
            {ingestionId: 'ing-1', timestamp: '2024-01-01T00:00:00Z', status: 'completed'},
            {ingestionId: 'ing-2', timestamp: '2024-01-02T00:00:00Z', status: 'failed'},
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 2,
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists ingestions', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', 'ds-abc'], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
    expect(stdout).to.contain('ing-2')
    expect(stdout).to.contain('completed')
    expect(stdout).to.contain('failed')
  })

  it('shows pagination info', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', 'ds-abc'], {root: process.cwd()})
    expect(stdout).to.contain('Page 1 of 1 (2 total items)')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', 'ds-abc', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(2)
  })
})
