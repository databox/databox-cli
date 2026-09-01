import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/permissions', response: {status: 'success', requestId: 'test', data: {accessLevel: 'everyone', users: []}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows permissions', async () => {
    const {stdout} = await runCommand(['dataset', 'permissions', '123'], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })
})
