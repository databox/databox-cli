import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/data-sources',
        response: {
          status: 'success',
          requestId: 'test',
          data: {id: 99, name: 'NewSource', integrationKey: 'Datadoo', timezone: 'UTC', statusInfo: {status: 'active'}, connectionId: null},
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a data source', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--name', 'NewSource'], {root: process.cwd()})
    expect(stdout).to.contain('NewSource')
    expect(stdout).to.contain('99')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--name', 'NewSource', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(99)
  })
})
