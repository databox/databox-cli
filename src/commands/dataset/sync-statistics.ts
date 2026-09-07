import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetSyncStatistics extends BaseCommand<typeof DatasetSyncStatistics> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Show sync history statistics for a dataset'

  static examples = [
    '<%= config.bin %> dataset sync-statistics 12345',
    '<%= config.bin %> dataset sync-statistics 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncStatistics)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<Record<string, unknown>>(`/v2/datasets/${args.datasetId}/sync-history/statistics`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
