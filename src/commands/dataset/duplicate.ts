import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetDuplicate extends BaseCommand<typeof DatasetDuplicate> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to duplicate', required: true}),
  }

  static description = 'Duplicate a dataset'

  static examples = [
    '<%= config.bin %> dataset duplicate 12345',
    '<%= config.bin %> dataset duplicate 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetDuplicate)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.post(`/v2/datasets/${args.datasetId}/duplicate`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
