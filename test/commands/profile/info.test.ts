import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('profile info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/profile',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'Test User', email: 'test@example.com', timezone: 'UTC', role: 'admin', accountType: 'standard', accountId: 100, isEmailVerified: true, createdAt: '2024-01-01'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows profile details', async () => {
    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Test User')
    expect(stdout).to.contain('test@example.com')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'info', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'Test User', email: 'test@example.com'})
  })
})
