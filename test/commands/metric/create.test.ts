import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'POST',
      path: '/v2/metrics',
      response: {status: 'success', requestId: 'test', data: {id: '42|custom_query_2', name: 'Revenue', dataSourceId: 42}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('creates a metric', async () => {
    const {stdout} = await runCommand([
      'metric', 'create',
      '--name', 'Revenue',
      '--dataset-id', '123',
      '--measure', '{"id":"amount","name":"Amount"}',
      '--date', '{"id":"date","name":"Date"}',
    ], {root: process.cwd()})
    expect(stdout).to.include('Revenue')
  })
})
