import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricUpdate extends BaseCommand<typeof MetricUpdate> {
  static args = {
    metricId: Args.string({description: 'The metric ID to update', required: true}),
  }

  static description = 'Update a metric'

  static examples = [
    '<%= config.bin %> metric update "500|custom_query_100" --name "New Name"',
    '<%= config.bin %> metric update "500|custom_query_100" --name "New Name" --json',
  ]

  static flags = {
    'aggregation-function': Flags.string({description: 'New aggregation applied to the measure'}),
    date: Flags.string({description: 'New date field reference as JSON ({"id":"...","name":"..."})'}),
    dimension: Flags.string({
      description: 'Dimension field reference as JSON ({"id":"...","name":"..."}); repeat for several',
      multiple: true,
    }),
    filters: Flags.string({
      description: 'JSON array of filters ([{"field":"...","operator":"...","values":["..."]}])',
    }),
    measure: Flags.string({description: 'New measure field reference as JSON ({"id":"...","name":"..."})'}),
    name: Flags.string({description: 'New name for the metric'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricUpdate)

    const REF = '{"id":"...","name":"..."}'

    const body: Record<string, unknown> = {}
    if (flags.name !== undefined) body.name = flags.name
    if (flags['aggregation-function'] !== undefined) body.aggregationFunction = flags['aggregation-function']
    if (flags.measure) body.measure = this.parseJsonFlag(flags.measure, 'measure', REF)
    if (flags.date) body.date = this.parseJsonFlag(flags.date, 'date', REF)
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

    if (Object.keys(body).length === 0) {
      this.error(
        'Provide at least one field to update (--name, --measure, --date, --aggregation-function, --dimension or --filters).',
        {exit: 1},
      )
    }

    const response = await this.apiClient.patch<Record<string, unknown>>(`/v2/metrics/${encodeURIComponent(args.metricId)}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
