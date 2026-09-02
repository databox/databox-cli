import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset data', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/data',
      response: {
        status: 'success',
        requestId: 'test',
        data: {items: [{id: 1, name: 'Alice', amount: 100}], pagination: {page: 0, pageSize: 25, totalItems: 1}},
      },
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows dataset data', async () => {
    const {stdout} = await runCommand(['dataset', 'data', '123'], {root: process.cwd()})
    expect(stdout).to.include('Alice')
  })
})
