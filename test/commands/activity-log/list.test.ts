import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('activity-log list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/account/activity-log',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [{id: 1, action: 'created', resourceType: 'dataset', resourceId: '123', timestamp: '2024-01-01T00:00:00Z', userName: 'Admin'}],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists activity log entries', async () => {
    const {stdout} = await runCommand(['activity-log', 'list'], {root: process.cwd()})
    expect(stdout).to.include('created')
    expect(stdout).to.include('dataset')
  })
})
