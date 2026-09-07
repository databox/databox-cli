import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('metric set-verification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'PUT',
      path: '/v2/metrics/42%7Ccustom_query_1/verification',
      response: {status: 'success', requestId: 'test', data: {isVerified: true}},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets verification status', async () => {
    const {stdout} = await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified'], {root: process.cwd()})
    expect(stdout).to.include('Is Verified')
  })

  // The API contract is {isVerified: boolean}, not {status}.
  it('sends isVerified, not status', async () => {
    await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/metrics/42%7Ccustom_query_1/verification')).to.deep.equal({isVerified: true})
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['metric', 'set-verification', '42|custom_query_1', '--status', 'verified', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.isVerified).to.equal(true)
  })
})
