import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources/42/permissions',
        response: {status: 'success', requestId: 'test', data: {accessLevel: 'everyone', users: []}},
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows permissions', async () => {
    const {stdout} = await runCommand(['data-source', 'permissions', '42'], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })
})
