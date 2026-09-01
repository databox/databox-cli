import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface IngestionResponse {
  errors?: unknown
  ingestionId: string
  metrics?: unknown
  status: string
  timestamp: string
}

export default class DatasetIngestion extends BaseCommand<typeof DatasetIngestion> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
    ingestionId: Args.string({description: 'The ingestion ID to retrieve', required: true}),
  }

  static description = 'Get details of a specific ingestion'

  static examples = [
    '<%= config.bin %> dataset ingestion 12345 ing-456',
    '<%= config.bin %> dataset ingestion 12345 ing-456 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetIngestion)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get<IngestionResponse>(
      `/v2/datasets/${args.datasetId}/ingestions/${args.ingestionId}`,
    )

    const output: Record<string, unknown> = {
      ingestionId: response.ingestionId,
      timestamp: response.timestamp,
      status: response.status,
    }

    if (response.metrics !== undefined) {
      output.metrics = typeof response.metrics === 'string' ? response.metrics : JSON.stringify(response.metrics)
    }

    if (response.errors !== undefined) {
      output.errors = typeof response.errors === 'string' ? response.errors : JSON.stringify(response.errors)
    }

    formatSingle(output, this.flags.json)
  }
}
