import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Lineage, printLineage} from '../../lib/lineage.js'

/** MetricsResponse.cs `MetricLineageResponse`: its own `id` is the metric key. */
interface LineageResponse extends Lineage {
  id: string
}

export default class MetricLineage extends BaseCommand<typeof MetricLineage> {
  static args = {
    metricId: Args.string({description: 'The metric ID (e.g., "500|custom_query_100")', required: true}),
  }

  static description = `Show metric lineage (parents and children)

Parents are what the metric is built from: the metrics a calculated metric reads, otherwise its dataset or data source. Children are the calculated metrics that read it; use "metric usages" for databoards and the like. Type is dataSource, dataset, mergedDataset, basicMetric or customMetric, the same as "dataset lineage". A metric that is not built on a dataset has no lineage and returns 404.`

  static examples = [
    '<%= config.bin %> metric lineage "500|custom_query_100"',
    '<%= config.bin %> metric lineage "500|script_7" --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(MetricLineage)

    this.requireMetricId(args.metricId, 'Metric ID')

    const response = await this.apiClient.get<LineageResponse>(`/v2/metrics/${encodeURIComponent(args.metricId)}/lineage`, undefined, this.accountHeaders)

    printLineage(response, this.outputFormat)
  }
}
