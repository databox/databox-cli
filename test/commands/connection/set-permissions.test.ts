import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('connection set-permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PUT',
        path: '/v2/connections/1/permissions',
        response: {
          data: {accessLevel: 'everyone'},
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

  it('sets permissions', async () => {
    const {stdout} = await runCommand(['connection', 'set-permissions', '1', '--access-level', 'everyone'], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'set-permissions', '1', '--access-level', 'everyone', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.accessLevel).to.equal('everyone')
  })
})
