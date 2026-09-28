import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  Pagination, addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {DataSourceListItem} from '../../lib/types.js'

interface DataSourceListResponse {
  items: DataSourceListItem[]
  pagination: Pagination
}

export default class DataSourceList extends BaseCommand<typeof DataSourceList> {
  static description = 'List all data sources'

  static examples = [
    '<%= config.bin %> data-source list',
    '<%= config.bin %> data-source list --search "Google"',
    '<%= config.bin %> data-source list --sort-by lastActivityAt --sort-order desc',
    '<%= config.bin %> data-source list --page 0 --page-size 10 --json',
  ]

  static flags = {
    'connection-id': Flags.integer({description: 'Filter by connection ID'}),
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags(['name', 'createdAt', 'lastActivityAt']),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['connection-id'] !== undefined) query.connectionId = this.flags['connection-id']
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DataSourceListResponse>('/v2/data-sources', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Integration', key: 'integrationKey'},
        {header: 'Timezone', key: 'timezone'},
        {get: row => row.connectionId ? String(row.connectionId) : '', header: 'Connection ID'},
        {get: row => row.statusInfo?.status ?? '', header: 'Status'},
        {get: row => row.lastActivityAt ?? '', header: 'Last Activity'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
