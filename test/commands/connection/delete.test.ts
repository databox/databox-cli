import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('connection delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/connections/1',
        response: {
          status: 'success',
          requestId: 'test',
          data: {},
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['connection', 'delete', '1', '--force'], {root: process.cwd()})
    expect(stdout).to.include('deleted')
  })
})
