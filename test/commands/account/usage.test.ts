import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('account usage', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/account/usage',
        response: {data: {dataSources: {current: 5, limit: 50}, users: {current: 2, limit: 10}}, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows usage stats', async () => {
    const {stdout} = await runCommand(['account', 'usage'], {root: process.cwd()})
    expect(stdout).to.contain('Users')
    expect(stdout).to.contain('Data Sources')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'usage', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.users).to.deep.include({current: 2, limit: 10})
  })
})
