import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/metadata', response: {status: 'success', requestId: 'test', data: {description: 'Test dataset', tags: ['tag1']}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'metadata', '123'], {root: process.cwd()})
    expect(stdout).to.include('Test dataset')
  })
})
