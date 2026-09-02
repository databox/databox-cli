import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset column-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/column-metadata',
      response: {status: 'success', requestId: 'test', data: [{columnId: 'date', description: 'The date', displayName: 'Date'}]},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows column metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'column-metadata', '123'], {root: process.cwd()})
    expect(stdout).to.include('date')
  })
})
