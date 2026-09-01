import {expect} from 'chai'
import {runCommand} from '@oclif/test'

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
})
