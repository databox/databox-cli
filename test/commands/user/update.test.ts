import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('user update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/users/1',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'Admin', role: 'admin'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates user role', async () => {
    const {stdout} = await runCommand(['user', 'update', '1', '--role', 'admin'], {root: process.cwd()})
    expect(stdout).to.contain('Admin')
    expect(stdout).to.contain('admin')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['user', 'update', '1', '--role', 'admin', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, role: 'admin'})
  })
})
