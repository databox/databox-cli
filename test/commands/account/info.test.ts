import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {account} from './fixtures.js'

describe('account info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/account',
        response: {data: account, requestId: 'test', status: 'success'},
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
    expect(stdout).to.contain('Tax Number: US123')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'info', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(account)
  })
})
