import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const PATH = '/v2/metrics/42%7Ccustom_query_1/verification'
const verification = {isVerified: true, verifiedAt: '2026-09-01T08:00:00+00:00', verifiedBy: {id: 31, name: 'Ada'}}

describe('metric set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: PATH, response: envelope(verification)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('Verification set to verified for metric 42|custom_query_1.')
  })

  // The API contract is {isVerified: boolean}, not {status}.
  it('sends isVerified, not status', async () => {
    await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified'], {root: process.cwd()})
    expect(lastBody('PUT', PATH)).to.deep.equal({isVerified: true})

    await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'unverified'], {root: process.cwd()})
    expect(lastBody('PUT', PATH)).to.deep.equal({isVerified: false})
  })

  it('prints the returned verification with --json', async () => {
    const {stdout} = await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(verification)
  })
})
