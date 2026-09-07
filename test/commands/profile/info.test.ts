import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('profile info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/profile',
        response: {
          data: {
            accountId: 100, accountType: 'standard', createdAt: '2024-01-01', email: 'test@example.com', id: 1, isEmailVerified: true, name: 'Test User', role: 'admin', timezone: 'UTC',
          }, requestId: 'test', status: 'success',
        },
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
    expect(parsed).to.deep.include({email: 'test@example.com', id: 1, name: 'Test User'})
  })
})
