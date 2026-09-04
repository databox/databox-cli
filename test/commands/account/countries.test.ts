import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account countries', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/account/countries',
      response: {status: 'success', requestId: 'test', data: {
        items: [{name: 'Slovenia', code: 'SI'}, {name: 'United States', code: 'US'}],
      }},
    }])
  })

  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('lists countries', async () => {
    const {stdout} = await runCommand(['account', 'countries'])
    expect(stdout).to.include('Slovenia')
    expect(stdout).to.include('SI')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'countries', '--json'])
    const json = JSON.parse(stdout)
    expect(json[0].code).to.equal('SI')
  })
})
