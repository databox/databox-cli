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
    'aggregation-function': Flags.string({
      default: 'sum',
      description: 'Aggregation applied to the measure',
    }),
    date: Flags.string({description: 'Date field reference as JSON ({"id":"...","name":"..."})', required: true}),
    dimension: Flags.string({
      description: 'Dimension field reference as JSON ({"id":"...","name":"..."}); repeat for several',
      multiple: true,
    }),
    filters: Flags.string({
      description: 'JSON array of filters ([{"field":"...","operator":"...","values":["..."]}])',
    }),
    'dataset-id': Flags.integer({description: 'Dataset ID to create the metric on', required: true}),
    measure: Flags.string({description: 'Measure field reference as JSON ({"id":"...","name":"..."})', required: true}),
    name: Flags.string({description: 'Name of the metric', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricCreate)

    const REF = '{"id":"...","name":"..."}'
    const date = this.parseJsonFlag(flags.date, 'date', REF)
    const measure = this.parseJsonFlag(flags.measure, 'measure', REF)

    const body: Record<string, unknown> = {
      aggregationFunction: flags['aggregation-function'],
      datasetId: flags['dataset-id'],
      date,
      measure,
      name: flags.name,
    }

    if (flags.dimension) {
      body.dimensions = flags.dimension.map((value) => this.parseJsonFlag(value, 'dimension', REF))
    }

    if (flags.filters) {
      body.filters = this.parseJsonFlag(
        flags.filters,
        'filters',
        '[{"field":"...","operator":"...","values":["..."]}]',
      )
    }

    const response = await this.apiClient.post<Record<string, unknown>>('/v2/metrics', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
