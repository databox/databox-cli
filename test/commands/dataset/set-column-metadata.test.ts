import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-column-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: '/v2/datasets/123/column-metadata', response: {status: 'success', requestId: 'test', data: {}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates column metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', '[{"columnId":"date","description":"Updated"}]'], {root: process.cwd()})
    expect(stdout).to.exist
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-column-metadata', '123', '--columns', '[{"columnId":"date","description":"Updated"}]', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('object')
  })
})
