import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-sync-frequency', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/sync-frequency', response: {status: 'success', requestId: 'test', data: {}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets sync frequency', async () => {
    const {stdout} = await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '60'], {root: process.cwd()})
    expect(stdout).to.include('Sync frequency set')
  })
})
