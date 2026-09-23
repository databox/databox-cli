import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {DatasetDetail} from '../../lib/types.js'

export default class DatasetGet extends BaseCommand<typeof DatasetGet> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to retrieve', required: true}),
  }

  static description = 'Get details of a specific dataset'

  static examples = [
    '<%= config.bin %> dataset get 12345',
    '<%= config.bin %> dataset get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetGet)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<DatasetDetail>(`/v2/datasets/${args.datasetId}`, undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
