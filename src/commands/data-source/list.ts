import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface DataSource {
  connectionId: number | null
  id: number
  integrationKey: string | null
  timezone: string | null
  name: string | null
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
    if (this.flags['connection-id'] !== undefined) query.connectionId = this.flags['connection-id']
    if (this.flags['sort-by']) query.sortBy = this.flags['sort-by']
    if (this.flags['sort-order']) query.sortOrder = this.flags['sort-order']

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
        {get: (row) => row.connectionId ? String(row.connectionId) : '', header: 'Connection ID'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
