import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  AGGREGATION_FUNCTIONS, FILTERS_SHAPE, REF_SHAPE, printMetricDetail,
} from '../../lib/metric.js'
import {MetricDetail} from '../../lib/types.js'

export default class MetricUpdate extends BaseCommand<typeof MetricUpdate> {
  static args = {
    metricId: Args.string({description: 'The metric ID to update', required: true}),
  }

  static description = `Update a custom metric

Only custom-query metrics can be updated. Fields you omit keep their current values. --dimension replaces the whole dimension list, and --clear-dimensions removes it. In --filters, omitting "conditions" keeps the stored ones, so "logicalOperator" can be changed on its own; "conditions": [] clears them. Prints the updated metric as "metric get" does.`

  static examples = [
    '<%= config.bin %> metric update "500|custom_query_100" --name "New Name"',
    '<%= config.bin %> metric update "500|custom_query_100" --measure \'{"id":"amount","displayName":"Amount"}\' --aggregation-function avg',
    `<%= config.bin %> metric update "500|custom_query_100" --filters '${FILTERS_SHAPE}'`,
    '<%= config.bin %> metric update "500|custom_query_100" --filters \'{"logicalOperator":"or"}\'',
    '<%= config.bin %> metric update "500|custom_query_100" --clear-dimensions',
    '<%= config.bin %> metric update "500|custom_query_100" --filters \'{"conditions":[]}\' --json',
  ]

  static flags = {
    'aggregation-function': Flags.string({description: 'New aggregation applied to the measure', options: AGGREGATION_FUNCTIONS}),
    'clear-dimensions': Flags.boolean({
      default: false,
      description: 'Remove every dimension (sends "dimensions": [])',
      exclusive: ['dimension'],
    }),
    date: Flags.string({description: `New date column reference as JSON (${REF_SHAPE})`}),
    dimension: Flags.string({
      description: `Dimension column reference as JSON (${REF_SHAPE}); repeat for several. Replaces the current dimensions`,
      exclusive: ['clear-dimensions'],
      multiple: true,
    }),
    filters: Flags.string({
      description: 'Filters as JSON: {logicalOperator: and|or, conditions: [{field, operator, values}]}. Omit conditions to keep them; [] clears them',
    }),
    measure: Flags.string({description: `New measure column reference as JSON (${REF_SHAPE})`}),
    name: Flags.string({description: 'New name for the metric'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricUpdate)

    const body: Record<string, unknown> = {}
    if (flags.name !== undefined) body.name = flags.name
    if (flags['aggregation-function'] !== undefined) body.aggregationFunction = flags['aggregation-function']
    if (flags.measure !== undefined) body.measure = this.parseJsonFlag(flags.measure, 'measure', REF_SHAPE)
    if (flags.date !== undefined) body.date = this.parseJsonFlag(flags.date, 'date', REF_SHAPE)
    if (flags.dimension) {
      body.dimensions = flags.dimension.map(value => this.parseJsonFlag(value, 'dimension', REF_SHAPE))
    }

    // A non-null list replaces the stored one upstream, so an empty list clears it.
    if (flags['clear-dimensions']) body.dimensions = []

    if (flags.filters !== undefined) {
      body.filters = this.parseJsonFlag(flags.filters, 'filters', FILTERS_SHAPE)
    }

    if (Object.keys(body).length === 0) {
      this.error(
        'Provide at least one field to update (--name, --measure, --date, --aggregation-function, --dimension, --clear-dimensions or --filters).',
        {exit: 1},
      )
    }

    const response = await this.apiClient.patch<MetricDetail>(`/v2/metrics/${encodeURIComponent(args.metricId)}`, body, this.accountHeaders)

    printMetricDetail(response, this.outputFormat)
  }
}
