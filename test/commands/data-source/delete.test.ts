import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'DELETE',
        path: '/v1/data-sources/42',
        response: {
          id: 42,
          title: 'Deleted',
          created: '2024-01-01T00:00:00Z',
          timezone: null,
          key: null,
          ingestionSupported: false,
        },
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
