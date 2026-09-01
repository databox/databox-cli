import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricData extends BaseCommand<typeof MetricData> {
  static description = 'Load metric data'

  static examples = [
    '<%= config.bin %> metric data --metric-id "500|custom_query_100" --date-from 2025-01-01 --date-to 2025-12-31 --granularity daily --dataset-id 123',
    '<%= config.bin %> metric data --metric-id "GoogleAnalytics4@sessions" --date-from 2025-01-01 --date-to 2025-12-31 --granularity monthly --data-source-id 42 --json',
  ]

  static flags = {
    'data-source-id': Flags.integer({description: 'Data source ID (alternative to --dataset-id)'}),
    'dataset-id': Flags.integer({description: 'Dataset ID (alternative to --data-source-id)'}),
    'date-from': Flags.string({description: 'Start date (YYYY-MM-DD)', required: true}),
    'date-to': Flags.string({description: 'End date (YYYY-MM-DD)', required: true}),
    granularity: Flags.string({description: 'Time granularity', options: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'allTime'], required: true}),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricData)

    if (!flags['data-source-id'] && !flags['dataset-id']) {
      this.error('Provide --data-source-id or --dataset-id.', {exit: 1})
    }

    const body: Record<string, unknown> = {
      dateRange: {
        from: flags['date-from'],
        granularity: flags.granularity,
        to: flags['date-to'],
      },
      metricId: flags['metric-id'],
    }

    if (flags['data-source-id']) body.dataSourceId = flags['data-source-id']
    if (flags['dataset-id']) body.datasetId = flags['dataset-id']

    const response = await this.apiClient.post('/v2/metrics/data', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
