import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Pagination, fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

/** DatasetResponse.cs `SyncHistoryItem`. */
interface SyncHistoryItem {
  duration: null | number
  error: {description: null | string; title: null | string} | null
  id: string
  initiatedAt: null | string
  status: string
  type: null | string
}

interface SyncHistoryResponse {
  items: SyncHistoryItem[]
  pagination: Pagination
}

export default class DatasetSyncHistory extends BaseCommand<typeof DatasetSyncHistory> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Show sync history for a dataset'

  static examples = [
    '<%= config.bin %> dataset sync-history 12345',
    '<%= config.bin %> dataset sync-history 12345 --page 0 --page-size 10',
    '<%= config.bin %> dataset sync-history 12345 --json',
  ]

  static flags = {
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncHistory)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query: Record<string, number | string | undefined> = {}

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<SyncHistoryResponse>(`/v2/datasets/${args.datasetId}/sync-history`, pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {get: row => row.initiatedAt ?? '', header: 'Initiated At'},
        {header: 'Status', key: 'status'},
        {get: row => row.type ?? '', header: 'Type'},
        {get: row => (row.duration === null ? '' : String(row.duration)), header: 'Duration'},
        {get: row => row.error?.title ?? '', header: 'Error'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
