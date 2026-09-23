import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {VerificationDetail} from '../../lib/types.js'

export default class MetricSetVerification extends BaseCommand<typeof MetricSetVerification> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = `Set metric verification status

The metric ID must carry its source ("500|custom_query_100"): an integration key without "|", such as "GoogleAnalytics4@sessions", is rejected with a 400. Prints a confirmation; --json or --output csv prints the resulting verification (isVerified, verifiedAt, verifiedBy) instead.`

  static examples = [
    '<%= config.bin %> metric set-verification "500|custom_query_100" --status verified',
    '<%= config.bin %> metric set-verification "500|custom_query_100" --status unverified --json',
  ]

  static flags = {
    status: Flags.string({description: 'Verification status', options: ['verified', 'unverified'], required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricSetVerification)

    const response = await this.apiClient.put<VerificationDetail>(`/v2/metrics/${encodeURIComponent(args.metricId)}/verification`, {
      isVerified: flags.status === 'verified',
    }, this.accountHeaders)

    if (this.outputFormat === 'table') {
      this.log(`Verification set to ${flags.status} for metric ${args.metricId}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
