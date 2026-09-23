import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('connection permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/connections/1/permissions',
        response: {
          data: {accessLevel: 'selectedUsers', accessList: [{id: 31, name: 'Ada'}], sharedWithClients: false},
          requestId: 'test',
          status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows permissions', async () => {
    const {stdout} = await runCommand(['connection', 'permissions', '1'], {root: process.cwd()})
    expect(stdout).to.include('selectedUsers')
    expect(stdout).to.include('Ada')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'permissions', '1', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({accessLevel: 'selectedUsers', accessList: [{id: 31, name: 'Ada'}], sharedWithClients: false})
  })
})
