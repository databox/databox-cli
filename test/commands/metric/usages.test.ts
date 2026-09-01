import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric usages', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/metrics/42%7Ccustom_query_1/usages',
      response: {status: 'success', requestId: 'test', data: {items: [{type: 'databoard', id: 1, name: 'Dashboard'}]}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows metric usages', async () => {
    const {stdout} = await runCommand(['metric', 'usages', '42|custom_query_1'], {root: process.cwd()})
    expect(stdout).to.include('Dashboard')
  })
})
