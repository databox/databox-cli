import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const verification = {isVerified: true, verifiedAt: '2026-09-01T08:00:00+00:00', verifiedBy: {id: 31, name: 'Ada'}}

describe('dataset set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/verification', response: envelope(verification)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['dataset', 'set-verification', '123', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('Verification set to verified for dataset 123.')
  })

  // The API contract is {isVerified: boolean}, not {status}. Asserted here because
  // sending the wrong field name is otherwise invisible to a mocked test.
  it('sends isVerified, not status', async () => {
    await runCommand(['dataset', 'set-verification', '123', '--status', 'verified'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/verification')).to.deep.equal({isVerified: true})

    await runCommand(['dataset', 'set-verification', '123', '--status', 'unverified'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/verification')).to.deep.equal({isVerified: false})
  })

  it('prints the returned verification with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-verification', '123', '--status', 'verified', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(verification)
  })
})
