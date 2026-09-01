import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetMetadata extends BaseCommand<typeof DatasetMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Get metadata for a dataset'

  static examples = [
    '<%= config.bin %> dataset metadata 12345',
    '<%= config.bin %> dataset metadata 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetMetadata)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get(`/v2/datasets/${args.datasetId}/metadata`)

    formatSingle(response, this.flags.json)
  }
}
