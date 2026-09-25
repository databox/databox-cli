import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const items = [
  {
    duration: 42, error: null, id: 'b1f0c2d3-0000-4000-8000-000000000001', initiatedAt: '2026-09-01T08:00:00+00:00', status: 'success', type: 'scheduledUpdate',
  },
  {
    duration: null,
    error: {description: 'The token expired.', title: 'Invalid credentials'},
    id: 'b1f0c2d3-0000-4000-8000-000000000002',
    initiatedAt: '2026-09-02T08:00:00+00:00',
    status: 'failed',
    type: 'userRequest',
  },
]

describe('dataset sync-history', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/sync-history',
      response: envelope({items, pagination: {page: 0, pageSize: 25, totalItems: 2}}),
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows sync history with type, duration and error', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-history', '123'], {root: process.cwd()})
    expect(stdout).to.include('b1f0c2d3-0000-4000-8000-000000000001')
    expect(stdout).to.include('scheduledUpdate')
    expect(stdout).to.include('42')
    expect(stdout).to.include('Invalid credentials')
  })

  it('outputs a bare array with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'sync-history', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })
})
