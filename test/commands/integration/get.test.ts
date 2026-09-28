import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

/** IntegrationResponse.cs `IntegrationDetail`. */
const integration = {
  avatar: 'https://cdn.example.com/ga4.png',
  categories: ['Analytics'],
  description: 'Connect to GA4',
  id: 101,
  key: 'GoogleAnalytics4',
  name: 'Google Analytics 4',
  supportsDatasets: true,
  supportsMetricBuilder: true,
}

describe('integration get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/integrations/101',
        response: {
          data: integration,
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

  it('gets integration details', async () => {
    const {stdout} = await runCommand(['integration', 'get', '101'], {root: process.cwd()})
    expect(stdout).to.include('Google Analytics 4')
    expect(stdout).to.include('Connect to GA4')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['integration', 'get', '101', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(integration)
  })
})
