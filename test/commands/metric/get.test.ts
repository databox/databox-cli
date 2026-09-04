import {runCommand} from '@oclif/test'
import {expect} from 'chai'

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

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['metric', 'get', '42|custom_query_1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal('42|custom_query_1')
  })
})
