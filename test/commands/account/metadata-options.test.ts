import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account metadata-options', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/account/metadata-options',
      response: {status: 'success', requestId: 'test', data: {
        businessClassifications: [{value: 'B2B', label: 'B2B'}],
        industries: [{value: 'Technology', label: 'Technology'}],
        companySizes: [{value: '1-10', label: '1-10'}],
        annualRevenues: [{value: '$0-$1M', label: '$0-$1M'}],
      }},
    }])
  })

  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('shows metadata options', async () => {
    const {stdout} = await runCommand(['account', 'metadata-options'])
    expect(stdout).to.include('B2B')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'metadata-options', '--json'])
    const json = JSON.parse(stdout)
    expect(json.businessClassifications).to.be.an('array')
  })
})
