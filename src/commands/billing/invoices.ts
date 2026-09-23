import {BaseCommand} from '../../base-command.js'
import {fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

/** BillingResponse.cs `InvoiceItem`. `amount` is in USD, converted from the minor units upstream reports. */
interface Invoice {
  amount: number
  date: null | string
  downloadUrl: null | string
  invoiceId: null | string
  receiptNumber: null | string
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
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<InvoicesResponse>('/v2/billing/invoices', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {get: row => row.invoiceId ?? '', header: 'Invoice ID'},
        {get: row => row.date ?? '', header: 'Date'},
        {get: row => String(row.amount), header: 'Amount (USD)'},
        {header: 'Status', key: 'status'},
        {get: row => row.receiptNumber ?? '', header: 'Receipt #'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
