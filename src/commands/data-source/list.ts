import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  addPagination, addSorting, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface DataSource {
  connectionId: null | number
  id: number
  integrationKey: null | string
  name: null | string
  timezone: null | string
}

interface DataSourceListResponse {
  items: DataSource[]
  pagination?: {page: number; pageSize: number; totalItems: number}
}

export default class DataSourceList extends BaseCommand<typeof DataSourceList> {
  static description = 'List all data sources'

  static examples = [
    '<%= config.bin %> data-source list',
    '<%= config.bin %> data-source list --search "Google"',
    '<%= config.bin %> data-source list --page 0 --page-size 10 --json',
  ]

  static flags = {
    'connection-id': Flags.integer({description: 'Filter by connection ID'}),
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags,
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    addPagination(query, this.flags)
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['connection-id'] !== undefined) query.connectionId = this.flags['connection-id']
    addSorting(query, this.flags)

    const response = await this.apiClient.get<DataSourceListResponse>(
      '/v2/data-sources',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Integration', key: 'integrationKey'},
        {header: 'Timezone', key: 'timezone'},
        {get: row => row.connectionId ? String(row.connectionId) : '', header: 'Connection ID'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
