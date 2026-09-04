import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('billing info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/billing',
        response: {status: 'success', requestId: 'test', data: {planName: 'Pro', planStatus: 'active', billingPeriod: 'monthly'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows billing details', async () => {
    const {stdout} = await runCommand(['billing', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Pro')
    expect(stdout).to.contain('active')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['billing', 'info', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({planName: 'Pro', planStatus: 'active'})
  })
})
