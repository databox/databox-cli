import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/account',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'UpdatedName', accountType: 'standard'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates account name', async () => {
    const {stdout} = await runCommand(['account', 'update', '--name', 'UpdatedName'], {root: process.cwd()})
    expect(stdout).to.contain('UpdatedName')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'update', '--name', 'UpdatedName', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'UpdatedName'})
  })
})
