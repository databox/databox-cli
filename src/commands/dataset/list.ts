import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  Pagination, addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {DatasetListItem} from '../../lib/types.js'

interface DatasetListResponse {
  items: DatasetListItem[]
  pagination: Pagination
}

export default class DatasetList extends BaseCommand<typeof DatasetList> {
  static description = 'List datasets'

  static examples = [
    '<%= config.bin %> dataset list',
    '<%= config.bin %> dataset list --search "revenue"',
    '<%= config.bin %> dataset list --sort-by lastActivityAt --sort-order desc',
    '<%= config.bin %> dataset list --page 0 --page-size 10',
    '<%= config.bin %> dataset list --json',
  ]

  static flags = {
    'data-source-id': Flags.string({description: 'Filter by data source ID'}),
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags(['name', 'createdAt', 'lastActivityAt']),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['data-source-id']) query.dataSourceId = this.flags['data-source-id']
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DatasetListResponse>('/v2/datasets', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.dataSourceId === null ? '' : String(row.dataSourceId)), header: 'Data Source'},
        {get: row => (row.ingestionSupported ? 'yes' : 'no'), header: 'Ingestion'},
        {get: row => row.statusInfo?.status ?? '', header: 'Status'},
        {get: row => row.syncInfo?.status ?? '', header: 'Sync status'},
        {get: row => row.lastActivityAt ?? '', header: 'Last activity'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
