import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('connection update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/connections/1',
        response: {
          status: 'success',
          requestId: 'test',
          data: {id: 1, name: 'Updated'},
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates a connection', async () => {
    const {stdout} = await runCommand(['connection', 'update', '1', '--name', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })
})
