import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, formatSingle} from '../../lib/output.js'

/** MetricsResponse.cs `MetricDimensionValuesResponse`. */
interface DimensionValuesResponse {
  dimensionValues: string[]
}

export default class MetricDimensionValues extends BaseCommand<typeof MetricDimensionValues> {
  static description = `Get the values of a metric's dimension

--dimension-id is a dimension id from "metric get" or "metric list". It takes one: the API accepts a list but only honours the first entry. An unknown dimension is rejected with the metric's available dimensions.`

  static examples = [
    '<%= config.bin %> metric dimension-values --metric-id "500|custom_query_100" --source-id 500 --dimension-id country',
    '<%= config.bin %> metric dimension-values --metric-id "GoogleAnalytics4@sessions" --source-id 42 --dimension-id country --json',
  ]

  static flags = {
    'dimension-id': Flags.string({
      description: 'Dimension id to list the values of',
      required: true,
    }),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
    'source-id': Flags.integer({
      description: 'The data source or dataset the metric belongs to (the sourceId shown by "metric list")',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricDimensionValues)

    // The endpoint takes a batch: {metrics: [{sourceId, metricId, dimensionIds}]}.
    const response = await this.apiClient.post<DimensionValuesResponse>('/v2/metrics/dimensions/values', {
      metrics: [
        {
          dimensionIds: [flags['dimension-id']],
          metricId: flags['metric-id'],
          sourceId: flags['source-id'],
        },
      ],
    }, this.accountHeaders)

    // --json returns the response whole; the table and CSV wrap the values for display.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    const values = response.dimensionValues ?? []
    formatOutput(values.map(value => ({value})), [{header: 'Value', key: 'value'}], this.outputFormat)
  }
}
