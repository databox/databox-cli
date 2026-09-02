import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: '/v2/datasets/123/metadata', response: {status: 'success', requestId: 'test', data: {description: 'Updated'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'set-metadata', '123', '--description', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })
})
