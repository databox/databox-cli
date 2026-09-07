import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Dataset {
  datasetType: string
  id: number
  name: string
  parentDataSourceId: number | null
  statusInfo: {status: string} | null
}

interface DatasetListResponse {
  items: Dataset[]
  pagination?: {page: number; pageSize: number; totalItems: number}
}

export default class AccountDatasets extends BaseCommand<typeof AccountDatasets> {
  static description = 'List datasets for the current account'

  static examples = [
    '<%= config.bin %> account datasets',
    '<%= config.bin %> account datasets --page 0 --page-size 20',
    '<%= config.bin %> account datasets --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<DatasetListResponse>(
      '/v2/datasets',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {get: (row) => (row.parentDataSourceId === null ? '' : String(row.parentDataSourceId)), header: 'Data Source ID'},
        {header: 'Name', key: 'name'},
        {header: 'Type', key: 'datasetType'},
        {get: (row) => row.statusInfo?.status ?? '', header: 'Status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
