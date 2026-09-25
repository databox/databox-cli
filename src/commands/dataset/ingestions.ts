import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Pagination, fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {UserRef} from '../../lib/types.js'

/** DatasetResponse.cs `DatasetIngestionListItem`. */
interface Ingestion {
  duration: null | number
  id: string
  initiatedAt: null | string
  initiatedBy: UserRef | null
  status: string
}

interface IngestionsResponse {
  items: Ingestion[]
  pagination: Pagination
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

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<IngestionsResponse>(`/v2/datasets/${args.datasetId}/ingestions`, pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'Ingestion ID', key: 'id'},
        {get: row => row.initiatedAt ?? '', header: 'Initiated At'},
        {header: 'Status', key: 'status'},
        {get: row => (row.duration === null ? '' : String(row.duration)), header: 'Duration'},
        {get: row => row.initiatedBy?.name ?? '', header: 'Initiated By'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
