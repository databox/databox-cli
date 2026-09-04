import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('integration list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/integrations',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [{id: 101, key: 'GoogleAnalytics4', name: 'Google Analytics 4', supportsDatasets: true}],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists integrations', async () => {
    const {stdout} = await runCommand(['integration', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Google Analytics 4')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['integration', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
