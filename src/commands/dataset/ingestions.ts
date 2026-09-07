import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Ingestion {
  duration: null | number
  finishedAt: null | string
  ingestionId: string
  startedAt: null | string
  status: string
}

interface IngestionsResponse {
  items: Ingestion[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class DatasetIngestions extends BaseCommand<typeof DatasetIngestions> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to list ingestions for', required: true}),
  }

  static description = 'List ingestions for a dataset'

  static examples = [
    '<%= config.bin %> dataset ingestions 12345',
    '<%= config.bin %> dataset ingestions 12345 --page 0 --page-size 20',
    '<%= config.bin %> dataset ingestions 12345 --json',
  ]

  static flags = {
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetIngestions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query: Record<string, number | string | undefined> = {}
    addPagination(query, this.flags)

    const response = await this.apiClient.get<IngestionsResponse>(
      `/v2/datasets/${args.datasetId}/ingestions`,
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'Ingestion ID', key: 'ingestionId'},
        {get: row => row.startedAt ?? '', header: 'Started At'},
        {get: row => row.finishedAt ?? '', header: 'Finished At'},
        {header: 'Status', key: 'status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
