import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('user invite', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/users',
        response: {
          data: {
            email: 'new@test.com', id: 2, name: '', role: 'user',
          }, requestId: 'test', status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('invites a user', async () => {
    const {stdout} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'user'], {root: process.cwd()})
    expect(stdout).to.contain('new@test.com')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'user', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({email: 'new@test.com', id: 2, role: 'user'})
  })
})
