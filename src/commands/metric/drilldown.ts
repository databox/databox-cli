import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricDrilldown extends BaseCommand<typeof MetricDrilldown> {
  static description = 'Get drilldown data for a metric'

  static examples = [
    '<%= config.bin %> metric drilldown --metric-id "500|custom_query_100" --dataset-id 123 --start-timestamp 1704067200 --end-timestamp 1706745600',
  ]

  static flags = {
    'dataset-id': Flags.integer({description: 'Dataset ID', required: true}),
    'end-timestamp': Flags.integer({description: 'End timestamp (Unix epoch)', required: true}),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
    'start-timestamp': Flags.integer({description: 'Start timestamp (Unix epoch)', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricDrilldown)

    const response = await this.apiClient.post('/v2/metrics/drilldown', {
      datasetId: flags['dataset-id'],
      metricId: flags['metric-id'],
      period: {
        endTimestamp: flags['end-timestamp'],
        startTimestamp: flags['start-timestamp'],
      },
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
