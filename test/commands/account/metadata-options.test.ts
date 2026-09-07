import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('account metadata-options', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/account/metadata-options',
      response: {
        data: {
          annualRevenues: [{label: '$0-$1M', value: '$0-$1M'}],
          businessClassifications: [{label: 'B2B', value: 'B2B'}],
          companySizes: [{label: '1-10', value: '1-10'}],
          industries: [{label: 'Technology', value: 'Technology'}],
        }, requestId: 'test', status: 'success',
      },
    }])
  })

  afterEach(() => {
    cleanupTestConfig()
    restoreApi()
  })

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
