import {runCommand} from '@oclif/test'
import {expect} from 'chai'

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

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'metadata', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.description).to.equal('Test dataset')
  })
})
