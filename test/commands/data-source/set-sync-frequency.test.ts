import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source set-sync-frequency', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PUT',
        path: '/v2/data-sources/42/sync-frequency',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets sync frequency', async () => {
    const {stdout} = await runCommand(['data-source', 'set-sync-frequency', '42', '--interval', '60'], {root: process.cwd()})
    expect(stdout).to.include('Sync frequency set')
  })
})
