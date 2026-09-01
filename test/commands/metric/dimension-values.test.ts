import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric dimension-values', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'POST',
      path: '/v2/metrics/dimensions/values',
      response: {status: 'success', requestId: 'test', data: {items: [{value: 'US'}, {value: 'UK'}]}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('gets dimension values', async () => {
    const {stdout} = await runCommand([
      'metric', 'dimension-values',
      '--metric-id', 'test',
      '--dimension', 'country',
      '--dataset-id', '123',
    ], {root: process.cwd()})
    expect(stdout).to.include('US')
  })
})
