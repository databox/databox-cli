import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/permissions', response: {status: 'success', requestId: 'test', data: {accessLevel: 'everyone'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets permissions', async () => {
    const {stdout} = await runCommand(['dataset', 'set-permissions', '123', '--access-level', 'everyone'], {root: process.cwd()})
    expect(stdout).to.include('Permissions updated')
  })
})
