import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Ingestion {
  ingestionId: string
  status: string
  timestamp: string
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
    '<%= config.bin %> dataset ingestions 12345 --page 1 --page-size 20',
    '<%= config.bin %> dataset ingestions 12345 --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetIngestions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<IngestionsResponse>(
      `/v2/datasets/${args.datasetId}/ingestions`,
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'Ingestion ID', key: 'ingestionId'},
        {header: 'Timestamp', key: 'timestamp'},
        {header: 'Status', key: 'status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
