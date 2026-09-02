import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/metrics',
      response: {
        status: 'success',
        requestId: 'test',
        data: {
          items: [{id: '42|custom_query_1', name: 'Revenue', dataSourceId: 42, type: 'custom_query'}],
          pagination: {page: 0, pageSize: 25, totalItems: 1},
        },
      },
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('lists metrics', async () => {
    const {stdout} = await runCommand(['metric', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Revenue')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['metric', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0].name).to.equal('Revenue')
  })
})
