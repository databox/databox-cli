import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricGet extends BaseCommand<typeof MetricGet> {
  static args = {
    metricId: Args.string({description: 'The metric ID (e.g., "500|custom_query_100")', required: true}),
  }

  static description = 'Get metric details'

  static examples = [
    '<%= config.bin %> metric get "500|custom_query_100"',
    '<%= config.bin %> metric get "GoogleAnalytics4@sessions" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricGet)

    const response = await this.apiClient.get(`/v2/metrics/${encodeURIComponent(args.metricId)}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
