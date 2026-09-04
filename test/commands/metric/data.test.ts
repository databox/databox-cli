import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric data', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'POST',
      path: '/v2/metrics/data',
      response: {
        status: 'success',
        requestId: 'test',
        data: {metric: {metricId: 'test', name: 'Revenue'}, dataPoints: [{date: '2024-01-01', value: 100}]},
      },
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('loads metric data', async () => {
    const {stdout} = await runCommand([
      'metric', 'data',
      '--metric-id', 'test',
      '--date-from', '2024-01-01',
      '--date-to', '2024-12-31',
      '--granularity', 'daily',
      '--dataset-id', '123',
    ], {root: process.cwd()})
    expect(stdout).to.include('Revenue')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand([
      'metric', 'data',
      '--metric-id', 'test',
      '--date-from', '2024-01-01',
      '--date-to', '2024-12-31',
      '--granularity', 'daily',
      '--dataset-id', '123',
      '--json',
    ], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.have.property('metric')
  })
})
