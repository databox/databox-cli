import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v2/datasets/123',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'delete', '123', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset 123 deleted')
  })
})
