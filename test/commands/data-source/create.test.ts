import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v1/data-sources',
        response: {
          id: 42,
          title: 'NewSource',
          created: '2024-01-01T00:00:00Z',
          timezone: 'UTC',
          key: 'ns_1',
          ingestionSupported: true,
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a data source', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--title', 'NewSource'], {root: process.cwd()})
    expect(stdout).to.contain('NewSource')
    expect(stdout).to.contain('42')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--title', 'NewSource', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(42)
  })
})
