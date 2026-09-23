import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

function mockBilling(data: Record<string, unknown>): void {
  mockApi([{method: 'GET', path: '/v2/billing', response: {data, requestId: 'test', status: 'success'}}])
}

describe('billing info', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows billing details', async () => {
    mockBilling({
      billingEmail: 'billing@example.com', billingPeriod: 'monthly', planName: 'Pro', planStatus: 'active',
    })
    const {stdout} = await runCommand(['billing', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Pro')
    expect(stdout).to.contain('active')
  })

  it('outputs JSON with --json', async () => {
    mockBilling({
      billingEmail: 'billing@example.com', billingPeriod: 'monthly', planName: 'Pro', planStatus: 'active',
    })
    const {stdout} = await runCommand(['billing', 'info', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({planName: 'Pro', planStatus: 'active'})
  })

  // Upstream's "none" billing cycle comes through as null.
  it('shows a plan with no billing period', async () => {
    mockBilling({
      billingEmail: null, billingPeriod: null, planName: 'Free', planStatus: 'active',
    })
    const {stdout} = await runCommand(['billing', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Billing Period: N/A')
  })
})
