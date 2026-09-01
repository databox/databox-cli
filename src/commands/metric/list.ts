import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Metric {
  dataSourceId: number
  id: string
  name: string
  type: string
}

interface MetricsResponse {
  items: Metric[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class MetricList extends BaseCommand<typeof MetricList> {
  static description = 'List metrics'

  static examples = [
    '<%= config.bin %> metric list',
    '<%= config.bin %> metric list --data-source-id 42',
    '<%= config.bin %> metric list --search revenue',
    '<%= config.bin %> metric list --json',
  ]

  static flags = {
    'data-source-id': Flags.string({description: 'Filter by data source ID'}),
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    search: Flags.string({description: 'Search by metric name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string> = {}
    if (this.flags['data-source-id']) query.dataSourceId = this.flags['data-source-id']
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.page !== undefined) query.page = String(this.flags.page)
    if (this.flags['page-size'] !== undefined) query.pageSize = String(this.flags['page-size'])

    const response = await this.apiClient.get<MetricsResponse>(
      '/v2/metrics',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Data Source ID', key: 'dataSourceId'},
        {header: 'Type', key: 'type'},
      ],
      this.flags.json,
    )

    if (response.pagination && !this.flags.json) {
      const {page, pageSize, totalItems} = response.pagination
      const totalPages = Math.ceil(totalItems / pageSize)
      this.log(`Page ${page + 1} of ${totalPages} (${totalItems} total items)`)
    }
  }
}
