import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset purge', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v1/datasets/ds-abc/purge',
        response: {
          message: 'Dataset purged successfully',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('purges with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'purge', 'ds-abc', '--force'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset purged successfully')
  })
})
