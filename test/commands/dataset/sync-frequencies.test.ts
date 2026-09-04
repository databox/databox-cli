import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset sync-frequencies', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/available-sync-frequencies',
      response: {status: 'success', requestId: 'test', data: {items: [{interval: 60, label: 'Hourly'}], pagination: {page: 0, pageSize: 25, totalItems: 1}}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('lists sync frequencies', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-frequencies', '123'], {root: process.cwd()})
    expect(stdout).to.include('Hourly')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-frequencies', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
