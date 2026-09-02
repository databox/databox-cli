import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [{id: 123, title: 'My Dataset', dataSourceId: 42, createdAt: '2024-01-01'}],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('lists datasets', async () => {
    const {stdout} = await runCommand(['dataset', 'list'], {root: process.cwd()})
    expect(stdout).to.include('My Dataset')
    expect(stdout).to.include('123')
  })
})
