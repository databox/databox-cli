import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricCreate extends BaseCommand<typeof MetricCreate> {
  static description = 'Create a custom metric'

  static examples = [
    '<%= config.bin %> metric create --name "Revenue" --dataset-id 123 --measure \'{"id":"amount","name":"Amount"}\' --date \'{"id":"created_at","name":"Created At"}\'',
    '<%= config.bin %> metric create --name "Revenue" --dataset-id 123 --measure \'{"id":"amount","name":"Amount"}\' --date \'{"id":"created_at","name":"Created At"}\' --json',
  ]

  static flags = {
    date: Flags.string({description: 'Date field reference as JSON ({"id":"...","name":"..."})', required: true}),
    'dataset-id': Flags.integer({description: 'Dataset ID to create the metric on', required: true}),
    measure: Flags.string({description: 'Measure field reference as JSON ({"id":"...","name":"..."})', required: true}),
    name: Flags.string({description: 'Name of the metric', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricCreate)

    let date: unknown
    try {
      date = JSON.parse(flags.date) as unknown
    } catch {
      this.error('Invalid JSON for --date. Expected format: {"id":"...","name":"..."}', {exit: 2})
    }

    let measure: unknown
    try {
      measure = JSON.parse(flags.measure) as unknown
    } catch {
      this.error('Invalid JSON for --measure. Expected format: {"id":"...","name":"..."}', {exit: 2})
    }

    const response = await this.apiClient.post('/v2/metrics', {
      datasetId: flags['dataset-id'],
      date,
      measure,
      name: flags.name,
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
