import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset sync-frequencies', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/available-sync-frequencies',
      response: {
        data: [{
          availability: 'included', isDefault: true, isSelected: true, label: 'Hourly', syncInterval: 60,
        }], requestId: 'test', status: 'success',
      },
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

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
