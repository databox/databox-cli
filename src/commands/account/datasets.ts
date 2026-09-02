import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Dataset {
  createdAt: string
  dataSourceId: number
  id: number
  title: string
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
        {header: 'Data Source ID', key: 'dataSourceId'},
        {header: 'Title', key: 'title'},
        {header: 'Created', key: 'createdAt'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
