import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

/** ActivityLogResponse.cs `ActivityLogEntry`. */
const entries = [
  {
    action: 'Ada renamed data source Orders',
    createdAt: '2026-09-01T08:00:00+00:00',
    details: {accountId: 100, newName: 'Orders', oldName: 'Orders v1'},
    id: 1,
    isSystem: false,
    resourceId: '42',
    resourceType: 'dataSource',
    user: {id: 31, name: 'Ada'},
  },
  {
    action: 'Scheduled sync finished',
    createdAt: '2026-09-01T09:00:00+00:00',
    details: null,
    id: 2,
    isSystem: true,
    resourceId: '123',
    resourceType: 'dataset',
    user: null,
  },
]

describe('activity-log list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/account/activity-log',
        response: {
          data: {items: entries, pagination: {page: 0, pageSize: 25, totalItems: 2}},
          requestId: 'test',
          status: 'success',
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
    expect(stdout).to.include('Ada renamed data source Orders')
    expect(stdout).to.include('dataSource')
    expect(stdout).to.include('Ada')
    expect(stdout).to.include('system')
  })

  it('passes the entries through whole with --json', async () => {
    const {stdout} = await runCommand(['activity-log', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(entries)
  })

  it('sends resourceType and userId', async () => {
    await runCommand(['activity-log', 'list', '--resource-type', 'dataSource', '--user-id', '31'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?resourceType=dataSource&userId=31')
  })

  it('rejects a resource type the API does not know with exit 2', async () => {
    const {error} = await runCommand(['activity-log', 'list', '--resource-type', 'data_source'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })

  it('rejects a non-integer --user-id with exit 2', async () => {
    const {error} = await runCommand(['activity-log', 'list', '--user-id', 'ada'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
