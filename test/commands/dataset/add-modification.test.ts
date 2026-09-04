import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset add-modification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets/123/modifications', response: {status: 'success', requestId: 'test', data: {id: 2}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('adds a modification', async () => {
    const {stdout} = await runCommand(['dataset', 'add-modification', '123', '--data', '{"type":"rename","from":"old","to":"new"}'], {root: process.cwd()})
    expect(stdout).to.not.be.empty
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'add-modification', '123', '--data', '{"type":"rename","from":"old","to":"new"}', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(2)
  })
})
