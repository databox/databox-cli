import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DatasetSetVerification extends BaseCommand<typeof DatasetSetVerification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Set verification status for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-verification 12345 --status verified',
    '<%= config.bin %> dataset set-verification 12345 --status unverified',
  ]

  static flags = {
    status: Flags.string({
      description: 'Verification status',
      options: ['verified', 'unverified'],
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetVerification)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    await this.apiClient.put(`/v2/datasets/${args.datasetId}/verification`, {status: flags.status}, this.accountHeaders)

    this.log(`Verification set to ${flags.status} for dataset ${args.datasetId}.`)
  }
}
