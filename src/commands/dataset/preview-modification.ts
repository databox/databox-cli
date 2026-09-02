import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetPreviewModification extends BaseCommand<typeof DatasetPreviewModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Preview a dataset modification before applying'

  static examples = [
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"rules":{...}}\'',
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"rules":{...}}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON string with modification rules to preview',
      required: true,
    }),
    page: Flags.integer({description: 'Page number', default: 0}),
    'page-size': Flags.integer({description: 'Items per page', default: 25}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetPreviewModification)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body = JSON.parse(this.flags.data) as Record<string, unknown>

    const response = await this.apiClient.post<Record<string, unknown>>(
      `/v2/datasets/${args.datasetId}/modifications/preview`,
      body,
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
