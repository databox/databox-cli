import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('data-source sync-frequencies', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources/42/available-sync-frequencies',
        response: {
          data: [{
            availability: 'included', isDefault: true, isSelected: true, label: 'Hourly', syncInterval: 60,
          }],
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

  it('lists available sync frequencies', async () => {
    const {stdout} = await runCommand(['data-source', 'sync-frequencies', '42'], {root: process.cwd()})
    expect(stdout).to.include('Hourly')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'sync-frequencies', '42', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
