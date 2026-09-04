import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetAddModification extends BaseCommand<typeof DatasetAddModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Add a modification to a dataset'

  static examples = [
    '<%= config.bin %> dataset add-modification 12345 --data \'{"columnId":"revenue","type":"sum"}\'',
    '<%= config.bin %> dataset add-modification 12345 --data \'{"columnId":"revenue","type":"sum"}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON object with modification data (columnId, type, etc.)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetAddModification)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    let body: Record<string, unknown>
    try {
      body = JSON.parse(flags.data) as Record<string, unknown>
    } catch {
      this.error('Invalid JSON for --data. Expected a JSON object.', {exit: 2})
    }

    const response = await this.apiClient.post(`/v2/datasets/${args.datasetId}/modifications`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
