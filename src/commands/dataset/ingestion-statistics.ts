import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetIngestionStatistics extends BaseCommand<typeof DatasetIngestionStatistics> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Get ingestion statistics for a dataset'

  static examples = [
    '<%= config.bin %> dataset ingestion-statistics 12345',
    '<%= config.bin %> dataset ingestion-statistics 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetIngestionStatistics)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get(`/v2/datasets/${args.datasetId}/ingestion-statistics`)

    formatSingle(response, this.flags.json)
  }
}
