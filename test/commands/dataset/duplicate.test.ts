import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset duplicate', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets/123/duplicate', response: {status: 'success', requestId: 'test', data: {id: 456, title: 'My Dataset (copy)'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('duplicates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'duplicate', '123'], {root: process.cwd()})
    expect(stdout).to.include('456')
    expect(stdout).to.include('My Dataset (copy)')
  })
})
