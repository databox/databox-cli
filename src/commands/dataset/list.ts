import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface DatasetListItem {
  datasetType: string
  id: number
  name: string
  parentDataSourceId: number | null
  statusInfo: {status: string} | null
  timezone: string | null
  verificationInfo: {isVerified: boolean} | null
}

interface DatasetListResponse {
  items: DatasetListItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class DatasetList extends BaseCommand<typeof DatasetList> {
  static description = 'List datasets'

  static examples = [
    '<%= config.bin %> dataset list',
    '<%= config.bin %> dataset list --search "revenue"',
    '<%= config.bin %> dataset list --page 0 --page-size 10',
    '<%= config.bin %> dataset list --json',
  ]

  static flags = {
    'data-source-id': Flags.string({description: 'Filter by data source ID'}),
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    search: Flags.string({description: 'Search by name'}),
    'sort-by': Flags.string({description: 'Field to sort by'}),
    'sort-order': Flags.string({description: 'Sort direction', options: ['asc', 'desc']}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['data-source-id']) query.dataSourceId = this.flags['data-source-id']
    if (this.flags['sort-by']) query.sortBy = this.flags['sort-by']
    if (this.flags['sort-order']) query.sortOrder = this.flags['sort-order']

    const response = await this.apiClient.get<DatasetListResponse>(
      '/v2/datasets',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: (row) => (row.parentDataSourceId === null ? '' : String(row.parentDataSourceId)), header: 'Data Source ID'},
        {header: 'Type', key: 'datasetType'},
        {get: (row) => row.statusInfo?.status ?? '', header: 'Status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
