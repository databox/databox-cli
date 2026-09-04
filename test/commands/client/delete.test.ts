import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('client delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/clients/1',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['client', 'delete', '1', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Client account 1 deleted')
  })
})
