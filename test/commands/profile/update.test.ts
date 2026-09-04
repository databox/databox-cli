import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('profile update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/profile',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'NewName', timezone: 'US/Eastern'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates profile name', async () => {
    const {stdout} = await runCommand(['profile', 'update', '--name', 'NewName'], {root: process.cwd()})
    expect(stdout).to.contain('NewName')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'update', '--name', 'NewName', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'NewName'})
  })
})
