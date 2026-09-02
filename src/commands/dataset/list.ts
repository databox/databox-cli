import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface DatasetListItem {
  createdAt: string
  dataSourceId: number
  id: number
  title: string
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
    page: Flags.integer({description: 'Page number (0-indexed)', default: 0}),
    'page-size': Flags.integer({description: 'Number of items per page', default: 25}),
    search: Flags.string({description: 'Search by name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number> = {
      page: this.flags.page ?? 0,
      pageSize: this.flags['page-size'] ?? 25,
    }

    if (this.flags.search) query.search = this.flags.search
    if (this.flags['data-source-id']) query.dataSourceId = this.flags['data-source-id']

    const response = await this.apiClient.get<DatasetListResponse>('/v2/datasets', query, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Title', key: 'title'},
        {header: 'Data Source ID', key: 'dataSourceId'},
        {header: 'Created', key: 'createdAt'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
