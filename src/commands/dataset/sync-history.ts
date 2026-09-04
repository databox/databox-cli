import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface SyncHistoryItem {
  completedAt: string | null
  startedAt: string
  status: string
}

interface SyncHistoryResponse {
  items: SyncHistoryItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class DatasetSyncHistory extends BaseCommand<typeof DatasetSyncHistory> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Show sync history for a dataset'

  static examples = [
    '<%= config.bin %> dataset sync-history 12345',
    '<%= config.bin %> dataset sync-history 12345 --page 0 --page-size 10',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncHistory)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<SyncHistoryResponse>(
      `/v2/datasets/${args.datasetId}/sync-history`,
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'Started At', key: 'startedAt'},
        {header: 'Completed At', get: (row) => row.completedAt ?? 'N/A'},
        {header: 'Status', key: 'status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
