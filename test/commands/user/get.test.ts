import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('user get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/users/1',
        response: {
          data: {
            email: 'admin@test.com', id: 1, name: 'Admin', role: 'admin',
          }, requestId: 'test', status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows user details', async () => {
    const {stdout} = await runCommand(['user', 'get', '1'], {root: process.cwd()})
    expect(stdout).to.contain('Admin')
    expect(stdout).to.contain('admin@test.com')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['user', 'get', '1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'Admin'})
  })
})
