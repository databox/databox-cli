import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricUsages extends BaseCommand<typeof MetricUsages> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = 'Get where a metric is used'

  static examples = [
    '<%= config.bin %> metric usages "500|custom_query_100"',
    '<%= config.bin %> metric usages "500|custom_query_100" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricUsages)

    const response = await this.apiClient.get(`/v2/metrics/${encodeURIComponent(args.metricId)}/usages`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
