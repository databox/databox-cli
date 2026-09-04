import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/verification', response: {status: 'success', requestId: 'test', data: {status: 'verified'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('shows verification status', async () => {
    const {stdout} = await runCommand(['dataset', 'verification', '123'], {root: process.cwd()})
    expect(stdout).to.include('verified')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'verification', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.status).to.equal('verified')
  })
})
