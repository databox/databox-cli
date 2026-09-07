import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/verification', response: {data: {isVerified: true}, requestId: 'test', status: 'success'}}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['dataset', 'set-verification', '123', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('verified')
  })

  // The API contract is {isVerified: boolean}, not {status}. Asserted here because
  // sending the wrong field name is otherwise invisible to a mocked test.
  it('sends isVerified, not status', async () => {
    await runCommand(['dataset', 'set-verification', '123', '--status', 'verified'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/verification')).to.deep.equal({isVerified: true})

    await runCommand(['dataset', 'set-verification', '123', '--status', 'unverified'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/verification')).to.deep.equal({isVerified: false})
  })
})
