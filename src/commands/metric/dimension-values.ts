import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface DimensionValuesResponse {
  dimensionValues: string[]
}

export default class MetricDimensionValues extends BaseCommand<typeof MetricDimensionValues> {
  static description = 'Get dimension values for a metric'

  static examples = [
    '<%= config.bin %> metric dimension-values --metric-id "500|custom_query_100" --dimension country --source-id 123',
    '<%= config.bin %> metric dimension-values --metric-id "500|custom_query_100" --dimension country --dimension city --source-id 123',
    '<%= config.bin %> metric dimension-values --metric-id "500|custom_query_100" --dimension country --source-id 123 --json',
  ]

  static flags = {
    dimension: Flags.string({
      description: 'Dimension key (repeat for several)',
      multiple: true,
      required: true,
    }),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
    'source-id': Flags.integer({
      description: 'Source ID of the metric (the sourceId shown by "metric list")',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricDimensionValues)

    // The endpoint takes a batch: {metrics: [{dataSourceId, metricId, dimensions}]}.
    const response = await this.apiClient.post<DimensionValuesResponse>('/v2/metrics/dimensions/values', {
      metrics: [
        {
          dataSourceId: flags['source-id'],
          dimensions: flags.dimension,
          metricId: flags['metric-id'],
        },
      ],
    }, this.accountHeaders)

    const values = response.dimensionValues ?? []

    // --json returns the API's own list of strings; the table wraps them for display.
    if (this.flags.json) {
      console.log(JSON.stringify(values, null, 2))
      return
    }

    formatOutput(values.map((value) => ({value})), [{header: 'Value', key: 'value'}], false)
  }
}
