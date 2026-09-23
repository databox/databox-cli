import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Pagination, fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {MetricListItem} from '../../lib/types.js'

interface MetricsResponse {
  items: MetricListItem[]
  pagination: Pagination
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
    'source-id': Flags.integer({description: 'Filter by source ID (data source or dataset)'}),
    ...paginationFlags,
    search: Flags.string({description: 'Search by metric name or ID'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags['source-id'] !== undefined) query.sourceId = this.flags['source-id']
    if (this.flags.search) query.search = this.flags.search

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<MetricsResponse>('/v2/metrics', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.sourceId === null ? '' : String(row.sourceId)), header: 'Source ID'},
        {get: row => row.dimensions.map(dimension => dimension.displayName).join(', '), header: 'Dimensions'},
        {get: row => (row.supportsDrilldown ? 'yes' : ''), header: 'Drilldown'},
        {get: row => (row.verificationInfo?.isVerified ? 'yes' : ''), header: 'Verified'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
