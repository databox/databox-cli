import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('data-source purge', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/data-sources/42/purge',
        response: {data: {}, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('purges with --force', async () => {
    const {stdout} = await runCommand(['data-source', 'purge', '42', '--force'], {root: process.cwd()})
    expect(stdout).to.include('purged')
  })
})
