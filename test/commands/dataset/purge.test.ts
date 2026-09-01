import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset purge', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/datasets/123/purge',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('purges with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'purge', '123', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset 123 purged')
  })
})
