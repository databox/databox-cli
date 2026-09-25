import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {VerificationDetail} from '../../lib/types.js'

export default class DatasetSetVerification extends BaseCommand<typeof DatasetSetVerification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Set verification status for a dataset

Prints a confirmation; --json or --output csv prints the resulting verification (isVerified, verifiedAt, verifiedBy) instead.`

  static examples = [
    '<%= config.bin %> dataset set-verification 12345 --status verified',
    '<%= config.bin %> dataset set-verification 12345 --status unverified --json',
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

    const response = await this.apiClient.put<VerificationDetail>(`/v2/datasets/${args.datasetId}/verification`, {isVerified: flags.status === 'verified'}, this.accountHeaders)

    if (this.outputFormat === 'table') {
      this.log(`Verification set to ${flags.status} for dataset ${args.datasetId}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
