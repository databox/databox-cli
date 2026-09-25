import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('organization countries', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/organization/countries',
      response: {
        data: {
          items: [{code: 'SI', name: 'Slovenia'}, {code: 'US', name: 'United States'}],
        }, requestId: 'test', status: 'success',
      },
    }])
  })

  afterEach(() => {
    cleanupTestConfig()
    restoreApi()
  })

  it('lists countries', async () => {
    const {stdout} = await runCommand(['organization', 'countries'])
    expect(stdout).to.include('Slovenia')
    expect(stdout).to.include('SI')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['organization', 'countries', '--json'])
    const json = JSON.parse(stdout)
    expect(json[0].code).to.equal('SI')
  })
})
