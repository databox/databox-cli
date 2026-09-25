import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, formatSingle} from '../../lib/output.js'
import {MetricDimension} from '../../lib/types.js'

/** DataboardFilters.cs `DataboardMetricFilterCondition`. `type` is dimension or unit. */
interface FilterCondition {
  field: string
  operator: string
  type: string
  values: string[]
}

/** DataboardFilters.cs `DataboardMetricFilters`. The operators are AND or OR. */
interface AppliedFilters {
  groups: Array<{conditions: FilterCondition[]; logicalOperator: string}>
  logicalOperator: string
}

/** DataboardResponse.cs `DataboardDatablockMetric`. */
interface DatablockMetric {
  appliedFilters: AppliedFilters | null
  dateRange: {from: string; granularity: string; to: string}
  dimensions: MetricDimension[]
  id: string
  name: string
  sourceId: number
  sourceName: string
}

/** DataboardResponse.cs `DataboardDatablock`. `visualizationType` is null when unknown. */
interface Datablock {
  id: number
  metrics: DatablockMetric[]
  name: string
  visualizationType: null | string
}

/** DataboardResponse.cs `DataboardMetricsResponse`. */
interface DataboardMetricsResponse {
  datablocks: Datablock[]
}

interface Row {
  datablock: Datablock
  metric?: DatablockMetric
}

export default class DataboardMetrics extends BaseCommand<typeof DataboardMetrics> {
  static args = {
    databoardId: Args.string({description: 'The databoard ID', required: true}),
  }

  static description = `Get the metrics on a databoard

One row per metric on each datablock; a datablock without metrics gets one row of its own. --json returns the whole response, including each metric's applied filters, which "metric drilldown --filters" accepts as they are.`

  static examples = [
    '<%= config.bin %> databoard metrics 12345',
    '<%= config.bin %> databoard metrics 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataboardMetrics)
    this.requireNumericId(args.databoardId, 'Databoard ID')

    const response = await this.apiClient.get<DataboardMetricsResponse>(`/v2/databoards/${args.databoardId}/metrics`, undefined, this.accountHeaders)

    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    const rows: Row[] = response.datablocks.flatMap(datablock =>
      datablock.metrics.length > 0 ? datablock.metrics.map(metric => ({datablock, metric})) : [{datablock}])

    formatOutput(
      rows,
      [
        {get: row => row.datablock.name, header: 'Datablock'},
        {get: row => row.datablock.visualizationType ?? '', header: 'Visualization'},
        {get: row => row.metric?.id ?? '', header: 'Metric ID'},
        {get: row => row.metric?.name ?? '', header: 'Metric'},
        {get: row => row.metric?.sourceName ?? '', header: 'Source'},
        {get: row => row.metric?.dimensions.map(dimension => dimension.displayName).join(', ') ?? '', header: 'Dimensions'},
        {
          get(row) {
            if (!row.metric) return ''
            const {from, granularity, to} = row.metric.dateRange
            return `${from} to ${to} (${granularity})`
          },
          header: 'Date range',
        },
      ],
      this.outputFormat,
    )
  }
}
