import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const verification = {isVerified: true, verifiedAt: '2026-09-01T08:00:00+00:00', verifiedBy: {id: 31, name: 'Ada'}}

describe('dataset verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/verification', response: envelope(verification)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows verification status', async () => {
    const {stdout} = await runCommand(['dataset', 'verification', '123'], {root: process.cwd()})
    expect(stdout).to.include('Is Verified: true')
    expect(stdout).to.include('Ada')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'verification', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(verification)
  })
})
