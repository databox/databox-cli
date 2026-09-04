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

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get(`/v2/datasets/${args.datasetId}/ingestion-statistics`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
