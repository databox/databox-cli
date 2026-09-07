import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface SyncHistoryItem {
  affectedRows: number | null
  finishedAt: string | null
  startedAt: string | null
  status: string
  syncType: string | null
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
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncHistory)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query: Record<string, string | number | undefined> = {}
    addPagination(query, this.flags)

    const response = await this.apiClient.get<SyncHistoryResponse>(
      `/v2/datasets/${args.datasetId}/sync-history`,
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {get: (row) => row.startedAt ?? '', header: 'Started At'},
        {get: (row) => row.finishedAt ?? 'N/A', header: 'Finished At'},
        {header: 'Status', key: 'status'},
        {get: (row) => row.syncType ?? '', header: 'Type'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
