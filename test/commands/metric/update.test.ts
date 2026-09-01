import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'PATCH',
      path: '/v2/metrics/42%7Ccustom_query_1',
      response: {status: 'success', requestId: 'test', data: {id: '42|custom_query_1', name: 'Updated'}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates a metric', async () => {
    const {stdout} = await runCommand(['metric', 'update', '42|custom_query_1', '--name', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })
})
