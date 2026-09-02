import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/data-sources/42',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['data-source', 'delete', '42', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Data source 42 deleted')
  })
})
