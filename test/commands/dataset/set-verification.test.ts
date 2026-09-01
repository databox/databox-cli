import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/verification', response: {status: 'success', requestId: 'test', data: {status: 'verified'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['dataset', 'set-verification', '123', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('verified')
  })
})
