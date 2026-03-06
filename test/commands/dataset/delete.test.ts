import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v1/datasets/ds-abc',
        response: {
          message: 'Dataset deleted successfully',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'delete', 'ds-abc', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset deleted successfully')
  })
})
