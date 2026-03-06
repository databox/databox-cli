import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/accounts',
        response: {accounts: [{id: 1, name: 'Test Account', accountType: 'standard'}]},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists accounts in table format', async () => {
    const {stdout} = await runCommand(['account', 'list'], {root: process.cwd()})
    expect(stdout).to.contain('Test Account')
    expect(stdout).to.contain('standard')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({id: 1, name: 'Test Account', accountType: 'standard'})
  })
})
