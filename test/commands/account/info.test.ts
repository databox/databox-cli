import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/account',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'Test Account', accountType: 'standard', companyName: 'Test Co'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows account details', async () => {
    const {stdout} = await runCommand(['account', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Test Account')
    expect(stdout).to.contain('standard')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'info', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'Test Account', accountType: 'standard'})
  })
})
