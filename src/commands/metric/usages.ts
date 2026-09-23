import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

/** MetricsResponse.cs `MetricUsageItem`. `datablockName` is set for board references. */
interface MetricUsage {
  datablockName: null | string
  referenceId: number
  referenceName: string
  referenceType: string
}

/** MetricsResponse.cs `MetricUsagesResponse`. */
interface UsagesResponse {
  items: MetricUsage[]
}

export default class MetricUsages extends BaseCommand<typeof MetricUsages> {
  static args = {
    metricId: Args.string({description: 'The metric ID', required: true}),
  }

  static description = `Get where a metric is used

Type is board, alert, goal, report, forecast, scorecard or calculatedMetric. Only custom-query metrics (IDs like "500|custom_query_100") are looked up: for any other metric the list is always empty, as it is for a metric whose query has since been deleted.`

  static examples = [
    '<%= config.bin %> metric usages "500|custom_query_100"',
    '<%= config.bin %> metric usages "500|custom_query_100" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricUsages)

    const response = await this.apiClient.get<UsagesResponse>(`/v2/metrics/${encodeURIComponent(args.metricId)}/usages`, undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Type', key: 'referenceType'},
        {get: row => String(row.referenceId), header: 'ID'},
        {header: 'Name', key: 'referenceName'},
        {get: row => row.datablockName ?? '', header: 'Datablock'},
      ],
      this.outputFormat,
    )
  }
}
