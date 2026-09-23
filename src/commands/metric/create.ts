import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {
  AGGREGATION_FUNCTIONS, FILTERS_SHAPE, REF_SHAPE, printMetricDetail,
} from '../../lib/metric.js'
import {MetricDetail} from '../../lib/types.js'

export default class MetricCreate extends BaseCommand<typeof MetricCreate> {
  static description = `Create a custom metric on a dataset

Column references are {"id","displayName"}, with the id taken from "dataset schema". --filters is one group of conditions with a shared logicalOperator (and or or). Prints the new metric as "metric get" does.`

  static examples = [
    '<%= config.bin %> metric create --name "Revenue" --dataset-id 123 --measure \'{"id":"amount","displayName":"Amount"}\' --date \'{"id":"created_at","displayName":"Created At"}\'',
    '<%= config.bin %> metric create --name "Revenue by country" --dataset-id 123 --measure \'{"id":"amount","displayName":"Amount"}\' --date \'{"id":"created_at","displayName":"Created At"}\' --aggregation-function avg --dimension \'{"id":"country","displayName":"Country"}\'',
    `<%= config.bin %> metric create --name "US revenue" --dataset-id 123 --measure '{"id":"amount","displayName":"Amount"}' --date '{"id":"created_at","displayName":"Created At"}' --filters '${FILTERS_SHAPE}' --json`,
  ]

  static flags = {
    'aggregation-function': Flags.string({
      default: 'sum',
      description: 'Aggregation applied to the measure',
      options: AGGREGATION_FUNCTIONS,
    }),
    'dataset-id': Flags.integer({description: 'Dataset ID to create the metric on (a dataset, not a data source)', required: true}),
    date: Flags.string({description: `Date column reference as JSON (${REF_SHAPE})`, required: true}),
    dimension: Flags.string({
      description: `Dimension column reference as JSON (${REF_SHAPE}); repeat for several`,
      multiple: true,
    }),
    filters: Flags.string({
      description: `Filters as JSON: {logicalOperator: and|or, conditions: [{field, operator, values}]}, e.g. ${FILTERS_SHAPE}`,
    }),
    ...idempotencyFlags,
    measure: Flags.string({description: `Measure column reference as JSON (${REF_SHAPE})`, required: true}),
    name: Flags.string({description: 'Name of the metric', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(MetricCreate)

    const date = this.parseJsonFlag(flags.date, 'date', REF_SHAPE)
    const measure = this.parseJsonFlag(flags.measure, 'measure', REF_SHAPE)

    const body: Record<string, unknown> = {
      aggregationFunction: flags['aggregation-function'],
      datasetId: flags['dataset-id'],
      date,
      measure,
      name: flags.name,
    }

    if (flags.dimension) {
      body.dimensions = flags.dimension.map(value => this.parseJsonFlag(value, 'dimension', REF_SHAPE))
    }

    if (flags.filters !== undefined) {
      body.filters = this.parseJsonFlag(flags.filters, 'filters', FILTERS_SHAPE)
    }

    const response = await this.apiClient.post<MetricDetail>('/v2/metrics', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    printMetricDetail(response, this.outputFormat)
  }
}
