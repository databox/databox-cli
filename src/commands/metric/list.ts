import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Metric {
  dimensions: string[]
  id: string
  name: string
  sourceId: null | number
  supportsDrilldown: boolean
  verificationInfo: {isVerified: boolean} | null
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
    '<%= config.bin %> metric list --source-id 42',
    '<%= config.bin %> metric list --search revenue',
    '<%= config.bin %> metric list --json',
  ]

  static flags = {
    'source-id': Flags.string({description: 'Filter by source ID (data source or dataset)'}),
    ...paginationFlags,
    search: Flags.string({description: 'Search by metric name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags['source-id']) query.sourceId = this.flags['source-id']
    if (this.flags.search) query.search = this.flags.search
    addPagination(query, this.flags)

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
        {get: row => (row.sourceId === null ? '' : String(row.sourceId)), header: 'Source ID'},
        {get: row => row.dimensions.join(', '), header: 'Dimensions'},
        {get: row => (row.verificationInfo?.isVerified ? 'yes' : ''), header: 'Verified'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
