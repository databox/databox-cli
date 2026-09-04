import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricSetVerification extends BaseCommand<typeof MetricSetVerification> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = 'Set metric verification status'

  static examples = [
    '<%= config.bin %> metric set-verification "500|custom_query_100" --status verified',
    '<%= config.bin %> metric set-verification "500|custom_query_100" --status unverified',
  ]

  static flags = {
    status: Flags.string({description: 'Verification status', options: ['verified', 'unverified'], required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricSetVerification)

    const response = await this.apiClient.put(`/v2/metrics/${encodeURIComponent(args.metricId)}/verification`, {
      status: flags.status,
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
