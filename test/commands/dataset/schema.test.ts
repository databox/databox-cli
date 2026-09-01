import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset schema', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/schema',
      response: {status: 'success', requestId: 'test', data: {items: [{columnId: 'date', dataType: 'datetime'}, {columnId: 'value', dataType: 'number'}]}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows dataset schema', async () => {
    const {stdout} = await runCommand(['dataset', 'schema', '123'], {root: process.cwd()})
    expect(stdout).to.include('date')
    expect(stdout).to.include('datetime')
  })
})
