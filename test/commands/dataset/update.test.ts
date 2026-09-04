import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: '/v2/datasets/123', response: {status: 'success', requestId: 'test', data: {id: 123, title: 'Updated'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'update', '123', '--title', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'update', '123', '--title', 'Updated', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(123)
  })

  it('requires at least one update field', async () => {
    const {error} = await runCommand(['dataset', 'update', '12345'], {root: process.cwd()})
    expect(error?.message).to.include('Provide at least one field')
  })
})
