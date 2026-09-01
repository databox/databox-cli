import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset clear-modifications', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'DELETE', path: '/v2/datasets/123/modifications', response: {status: 'success', requestId: 'test', data: {}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('clears modifications with --force', async () => {
    const {stdout} = await runCommand(['dataset', 'clear-modifications', '123', '--force'], {root: process.cwd()})
    expect(stdout).to.include('Modifications cleared')
  })
})
