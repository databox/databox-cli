import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {VerificationDetail} from '../../lib/types.js'

export default class MetricVerification extends BaseCommand<typeof MetricVerification> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = `Get metric verification status

The metric ID must carry its source ("500|custom_query_100"): an integration key without "|", such as "GoogleAnalytics4@sessions", is rejected with a 400.`

  static examples = [
    '<%= config.bin %> metric verification "500|custom_query_100"',
    '<%= config.bin %> metric verification "500|custom_query_100" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricVerification)

    const response = await this.apiClient.get<VerificationDetail>(`/v2/metrics/${encodeURIComponent(args.metricId)}/verification`, undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
