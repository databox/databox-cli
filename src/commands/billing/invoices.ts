import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Invoice {
  amount: number
  currency: string
  date: string | null
  description: string
  downloadUrl: string | null
  status: string
}

interface InvoicesResponse {
  items: Invoice[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class BillingInvoices extends BaseCommand<typeof BillingInvoices> {
  static description = 'List invoices'

  static examples = [
    '<%= config.bin %> billing invoices',
    '<%= config.bin %> billing invoices --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<InvoicesResponse>(
      '/v2/billing/invoices',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {get: (row) => row.date ?? '', header: 'Date'},
        {header: 'Description', key: 'description'},
        {get: (row) => `${row.amount} ${row.currency}`, header: 'Amount'},
        {header: 'Status', key: 'status'},
        {header: 'Download URL', get: (row) => row.downloadUrl ?? ''},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
