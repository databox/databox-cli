import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface DimensionValue {
  value: string
}

interface DimensionValuesResponse {
  items: DimensionValue[]
}

export default class MetricDimensionValues extends BaseCommand<typeof MetricDimensionValues> {
  static description = 'Get dimension values for a metric'

  static examples = [
    '<%= config.bin %> metric dimension-values --metric-id "500|custom_query_100" --dimension country --dataset-id 123',
  ]

  static flags = {
    'dataset-id': Flags.integer({description: 'Dataset ID', required: true}),
    dimension: Flags.string({description: 'Dimension key', required: true}),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricDimensionValues)

    const response = await this.apiClient.post<DimensionValuesResponse>('/v2/metrics/dimensions/values', {
      datasetId: flags['dataset-id'],
      dimension: flags.dimension,
      metricId: flags['metric-id'],
    }, this.accountHeaders)

    formatOutput(
      response.items,
      [{header: 'Value', key: 'value'}],
      this.flags.json,
    )
  }
}
