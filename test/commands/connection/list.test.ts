import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('connection list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/connections',
        response: {
          data: {
            items: [{
              id: 1, integrationKey: 'GoogleAnalytics4', name: 'GA4 Connection', status: 'active',
            }],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
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

  it('lists connections', async () => {
    const {stdout} = await runCommand(['connection', 'list'], {root: process.cwd()})
    expect(stdout).to.include('GA4 Connection')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
