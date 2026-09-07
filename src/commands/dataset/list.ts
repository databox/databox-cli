import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  addPagination, addSorting, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface DatasetListItem {
  datasetType: string
  id: number
  name: string
  parentDataSourceId: null | number
  statusInfo: {status: string} | null
  timezone: null | string
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
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags,
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    addPagination(query, this.flags)
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['data-source-id']) query.dataSourceId = this.flags['data-source-id']
    addSorting(query, this.flags)

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
        {get: row => (row.parentDataSourceId === null ? '' : String(row.parentDataSourceId)), header: 'Data Source ID'},
        {header: 'Type', key: 'datasetType'},
        {get: row => row.statusInfo?.status ?? '', header: 'Status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
