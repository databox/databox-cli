import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('integration get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/integrations/101',
        response: {
          status: 'success',
          requestId: 'test',
          data: {id: 101, key: 'GoogleAnalytics4', name: 'Google Analytics 4', supportsDatasets: true, description: 'Connect to GA4'},
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets integration details', async () => {
    const {stdout} = await runCommand(['integration', 'get', '101'], {root: process.cwd()})
    expect(stdout).to.include('Google Analytics 4')
    expect(stdout).to.include('Connect to GA4')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['integration', 'get', '101', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(101)
    expect(parsed.key).to.equal('GoogleAnalytics4')
  })
})
