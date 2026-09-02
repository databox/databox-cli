import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetUpdateModification extends BaseCommand<typeof DatasetUpdateModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Update a dataset modification'

  static examples = [
    '<%= config.bin %> dataset update-modification 12345 --data \'{"rules":{...},"displayNames":{...}}\'',
    '<%= config.bin %> dataset update-modification 12345 --data \'{"rules":{...}}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON string with modification data (rules, displayNames)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetUpdateModification)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body = JSON.parse(this.flags.data) as Record<string, unknown>

    const response = await this.apiClient.put<Record<string, unknown>>(`/v2/datasets/${args.datasetId}/modifications`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
