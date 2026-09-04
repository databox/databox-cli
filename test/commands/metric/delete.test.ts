import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric delete', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'DELETE',
      path: '/v2/metrics/42%7Ccustom_query_1',
      response: {status: 'success', requestId: 'test', data: {}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('deletes with --force', async () => {
    const {stdout} = await runCommand(['metric', 'delete', '42|custom_query_1', '--force'], {root: process.cwd()})
    expect(stdout).to.include('deleted')
  })
})
