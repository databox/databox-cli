import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset sync-history', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/sync-history',
      response: {status: 'success', requestId: 'test', data: {items: [{id: 1, timestamp: '2024-01-01', status: 'success'}], pagination: {page: 0, pageSize: 25, totalItems: 1}}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows sync history', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-history', '123'], {root: process.cwd()})
    expect(stdout).to.include('success')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-history', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
