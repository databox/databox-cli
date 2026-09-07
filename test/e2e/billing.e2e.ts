import {expect} from 'chai'

import {cli, expectField, expectKey, expectOk, json} from './helpers/cli.js'

interface Invoice {
  amount: number
  currency: string
  date: string
  downloadUrl: string | null
  status: string
}

describe('billing', () => {
  it('returns the current plan', async () => {
    const billing = json<Record<string, unknown>>(await cli(['billing', 'info', '--json']))

    expectField(billing, 'planName', 'string')
    expectField(billing, 'planStatus', 'string')
    expectKey(billing, 'billingPeriod')
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
      expectField(invoice, 'date', 'string')
      expectField(invoice, 'amount', 'number')
      expectField(invoice, 'currency', 'string')
      expectField(invoice, 'status', 'string')
      expectKey(invoice, 'downloadUrl')
    }
  })

  it('prints a friendly message when there are no invoices', async () => {
    const invoices = json<Invoice[]>(await cli(['billing', 'invoices', '--json']))
    const result = expectOk(await cli(['billing', 'invoices']))

    if (invoices.length === 0) {
      expect(result.stdout).to.include('No results found.')
    } else {
      expect(result.stdout).to.include('Date')
    }
  })
})
