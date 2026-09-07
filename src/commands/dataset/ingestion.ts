import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface IngestionResponse {
  duration?: null | number
  errors?: unknown
  finishedAt: null | string
  ingestionId: string
  metrics?: unknown
  startedAt: null | string
  status: string
  user?: {id: number; name: string} | null
}

export default class DatasetIngestion extends BaseCommand<typeof DatasetIngestion> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
    ingestionId: Args.string({description: 'The ingestion ID to retrieve', required: true}),
  }

  static description = 'Get details of a specific ingestion'

  static examples = [
    '<%= config.bin %> dataset ingestion 12345 3c63e510-276f-4541-9c66-8c00161fda82',
    '<%= config.bin %> dataset ingestion 12345 3c63e510-276f-4541-9c66-8c00161fda82 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetIngestion)

    this.requireNumericId(args.datasetId, 'Dataset ID')
    this.requireUuid(args.ingestionId, 'Ingestion ID')

    const response = await this.apiClient.get<IngestionResponse>(
      `/v2/datasets/${args.datasetId}/ingestions/${encodeURIComponent(args.ingestionId)}`,
      undefined,
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
