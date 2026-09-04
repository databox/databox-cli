import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/data-sources/42',
        response: {status: 'success', requestId: 'test', data: {id: 42, title: 'Updated'}},
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates a data source', async () => {
    const {stdout} = await runCommand(['data-source', 'update', '42', '--title', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'update', '42', '--title', 'Updated', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(42)
  })
})
