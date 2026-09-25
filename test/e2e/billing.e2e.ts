import {expect} from 'chai'

import {
  cli, expectField, expectKey, expectOk, json,
} from './helpers/cli.js'

/** BillingResponse.cs `InvoiceItem`. `amount` is USD; there is no currency or description field. */
interface Invoice {
  amount: number
  date: null | string
  downloadUrl: null | string
  invoiceId: null | string
  receiptNumber: null | string
  status: string
}

describe('billing', () => {
  it('returns the current plan', async () => {
    const billing = json<Record<string, unknown>>(await cli(['billing', 'info', '--json']))

    expectField(billing, 'planName', 'string')
    expectField(billing, 'planStatus', 'string')
    expectKey(billing, 'billingPeriod')
    expectKey(billing, 'billingEmail')
  })

  it('renders plan details as labelled output', async () => {
    const result = expectOk(await cli(['billing', 'info']))
    expect(result.stdout).to.include('Plan Name:')
  })

  it('lists invoices', async () => {
    const invoices = json<Invoice[]>(await cli(['billing', 'invoices', '--json']))

    expect(invoices).to.be.an('array')

    // The account may legitimately have no invoices; only check the shape when it does.
    if (invoices.length > 0) {
      const [invoice] = invoices
      expect(invoice).to.have.all.keys('invoiceId', 'date', 'amount', 'status', 'receiptNumber', 'downloadUrl')
      expectField(invoice, 'amount', 'number')
      expectField(invoice, 'status', 'string')
    } else {
      console.log('   note: the account has no invoices, so their fields could not be checked')
    }
  })

  it('prints a friendly message when there are no invoices', async () => {
    const invoices = json<Invoice[]>(await cli(['billing', 'invoices', '--json']))
    const result = expectOk(await cli(['billing', 'invoices']))

    if (invoices.length === 0) {
      expect(result.stdout).to.include('No results found.')
    } else {
      for (const header of ['Invoice ID', 'Date', 'Amount (USD)', 'Status', 'Receipt #']) expect(result.stdout).to.include(header)
    }
  })
})
