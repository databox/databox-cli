import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {accountDetail} from './fixtures.js'

describe('account get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/accounts/1',
        response: {data: accountDetail, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows account details', async () => {
    const {stdout} = await runCommand(['account', 'get', '1'], {root: process.cwd()})
    expect(stdout).to.contain('Account A')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'get', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(accountDetail)
  })
})
