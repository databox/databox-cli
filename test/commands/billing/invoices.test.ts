import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

/** BillingResponse.cs `InvoiceItem`: no currency (always USD) and no description. */
const invoices = [
  {
    amount: 99.5,
    date: '2026-08-01T00:00:00.0000000+00:00',
    downloadUrl: 'https://example.com/invoice.pdf',
    invoiceId: 'in_1PabcXYZ',
    receiptNumber: '2081-4432',
    status: 'paid',
  },
  {
    amount: 0,
    date: null,
    downloadUrl: null,
    invoiceId: null,
    receiptNumber: null,
    status: 'open',
  },
]

describe('billing invoices', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/billing/invoices',
        response: {
          data: {items: invoices, pagination: {page: 0, pageSize: 25, totalItems: 2}}, requestId: 'test', status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists invoices with the USD amount and receipt number', async () => {
    const {stdout} = await runCommand(['billing', 'invoices'], {root: process.cwd()})
    // Header, rule, then one line per invoice; cells are separated by │.
    const [header, , ...rows] = stdout.trim().split('\n').slice(0, 4).map(line => line.split('│').map(cell => cell.trim()))
    expect(header).to.deep.equal(['Invoice ID', 'Date', 'Amount (USD)', 'Status', 'Receipt #'])
    expect(rows).to.deep.equal([
      ['in_1PabcXYZ', '2026-08-01T00:00:00.0000000+00:00', '99.5', 'paid', '2081-4432'],
      ['', '', '0', 'open', ''],
    ])
  })

  it('passes the items through whole with --json', async () => {
    const {stdout} = await runCommand(['billing', 'invoices', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(invoices)
  })
})
