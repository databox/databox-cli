import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric drilldown', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'POST',
      path: '/v2/metrics/drilldown',
      response: {
        status: 'success',
        requestId: 'test',
        data: {items: [{date: '2024-01-01', value: 100}], schema: {items: [{columnId: 'date'}]}, pagination: {page: 0, pageSize: 25, totalItems: 1}},
      },
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('gets drilldown data', async () => {
    const {stdout} = await runCommand([
      'metric', 'drilldown',
      '--metric-id', 'test',
      '--dataset-id', '123',
      '--start-timestamp', '1704067200',
      '--end-timestamp', '1706745600',
    ], {root: process.cwd()})
    expect(stdout).to.not.be.empty
  })
})
