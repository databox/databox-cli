import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source sync-frequencies', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources/42/available-sync-frequencies',
        response: {
          status: 'success',
          requestId: 'test',
          data: {items: [{interval: 60, label: 'Hourly'}], pagination: {page: 0, pageSize: 25, totalItems: 1}},
        },
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('lists available sync frequencies', async () => {
    const {stdout} = await runCommand(['data-source', 'sync-frequencies', '42'], {root: process.cwd()})
    expect(stdout).to.include('Hourly')
  })
})
