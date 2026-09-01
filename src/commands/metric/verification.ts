import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricVerification extends BaseCommand<typeof MetricVerification> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = 'Get metric verification status'

  static examples = [
    '<%= config.bin %> metric verification "500|custom_query_100"',
    '<%= config.bin %> metric verification "500|custom_query_100" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricVerification)

    const response = await this.apiClient.get(`/v2/metrics/${encodeURIComponent(args.metricId)}/verification`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
