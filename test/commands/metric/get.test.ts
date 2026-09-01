import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/metrics/42%7Ccustom_query_1',
      response: {status: 'success', requestId: 'test', data: {id: '42|custom_query_1', name: 'Revenue', dataSourceId: 42, type: 'custom_query'}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('gets metric details', async () => {
    const {stdout} = await runCommand(['metric', 'get', '42|custom_query_1'], {root: process.cwd()})
    expect(stdout).to.include('Revenue')
  })
})
