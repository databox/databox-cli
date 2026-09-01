import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('billing invoices', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/billing/invoices',
        response: {status: 'success', requestId: 'test', data: {items: [{id: 1, date: '2024-01-01', amount: 99.00, status: 'paid', downloadUrl: 'https://example.com/invoice.pdf'}], pagination: {page: 0, pageSize: 25, totalItems: 1}}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists invoices', async () => {
    const {stdout} = await runCommand(['billing', 'invoices'], {root: process.cwd()})
    expect(stdout).to.contain('2024-01-01')
    expect(stdout).to.contain('paid')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['billing', 'invoices', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0]).to.deep.include({id: 1, status: 'paid'})
  })
})
