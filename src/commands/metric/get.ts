import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {printMetricDetail} from '../../lib/metric.js'
import {MetricDetail} from '../../lib/types.js'

export default class MetricGet extends BaseCommand<typeof MetricGet> {
  static args = {
    metricId: Args.string({description: 'The metric ID (e.g., "500|custom_query_100")', required: true}),
  }

  static description = `Get metric details

Type is event, general, current, or unknown when the metric's definition could not be read. Measure, date, aggregation and filters describe a custom-query metric's definition and are empty for integration and push metrics.`

  static examples = [
    '<%= config.bin %> metric get "500|custom_query_100"',
    '<%= config.bin %> metric get "GoogleAnalytics4@sessions" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricGet)

    this.requireMetricId(args.metricId, 'Metric ID')

    const response = await this.apiClient.get<MetricDetail>(`/v2/metrics/${encodeURIComponent(args.metricId)}`, undefined, this.accountHeaders)

    printMetricDetail(response, this.outputFormat)
  }
}
