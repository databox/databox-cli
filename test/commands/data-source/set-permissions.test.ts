import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source set-permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PUT',
        path: '/v2/data-sources/42/permissions',
        response: {status: 'success', requestId: 'test', data: {accessLevel: 'everyone'}},
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets permissions', async () => {
    const {stdout} = await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'everyone'], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })
})
