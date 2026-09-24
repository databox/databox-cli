import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('account delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/accounts/1',
        response: {data: {}, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['account', 'delete', '1', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Account 1 deleted.')
  })
})
