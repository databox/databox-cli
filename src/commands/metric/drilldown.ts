import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Row, rowColumns} from '../../lib/dataset-rows.js'
import {
  Paginated, addSorting, dataPaginationFlags, fetchPaginated, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, formatSingle, showPagination} from '../../lib/output.js'

/** MetricsResponse.cs `DrilldownSchemaColumn`. */
interface DrilldownSchemaColumn {
  dataType: string
  displayName: string
  id: string
}

/** MetricsResponse.cs `MetricDrilldownResponse`. `items` can be null. */
interface DrilldownResponse extends Paginated<Row> {
  schema: {items: DrilldownSchemaColumn[]} | null
}

const FILTERS_SHAPE = '{"logicalOperator":"AND","groups":[{"logicalOperator":"AND","conditions":[{"type":"dimension","field":"country","operator":"ANY_OF","values":["US"]}]}]}'

export default class MetricDrilldown extends BaseCommand<typeof MetricDrilldown> {
  static description = `Get the rows behind a metric's value

Only dataset-backed custom metrics support drilldown; check "Drilldown" in "metric list" or "metric get". To reproduce what a databoard shows, pass the same --dimension-id and --filters its datablock uses ("databoard metrics" reports both); without them you get every row in the period. Columns follow the response schema, headed by display name; --sort-by takes a column id. --json returns the whole response: the rows under "items", with "schema" and "pagination".`

  static examples = [
    '<%= config.bin %> metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600',
    '<%= config.bin %> metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600 --dimension-id country --sort-by amount --sort-order desc',
    `<%= config.bin %> metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600 --filters '${FILTERS_SHAPE}' --json`,
  ]

  static flags = {
    'dimension-id': Flags.string({description: 'Dimension id the metric is broken down by (repeat for several)', multiple: true}),
    'end-timestamp': Flags.integer({description: 'End of the period (Unix timestamp, seconds)', required: true}),
    filters: Flags.string({
      description: `Filters as JSON: {logicalOperator, groups: [{logicalOperator, conditions: [{type, field, operator, values}]}]}, e.g. ${FILTERS_SHAPE}`,
    }),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
    ...dataPaginationFlags,
    ...sortFlags(),
    'source-id': Flags.integer({description: 'The dataset the metric belongs to (the sourceId shown by "metric list")', required: true}),
    'start-timestamp': Flags.integer({description: 'Start of the period (Unix timestamp, seconds)', required: true}),
  }

  async run(): Promise<void> {
    // The API rejects both too, but checking here fails before the request.
    if (this.flags['sort-order'] && !this.flags['sort-by']) {
      this.error('--sort-order requires --sort-by.', {exit: 2})
    }

    if (this.flags['start-timestamp'] > this.flags['end-timestamp']) {
      this.error('--start-timestamp must be earlier than or equal to --end-timestamp.', {exit: 2})
    }

    const body: Record<string, unknown> = {
      metricId: this.flags['metric-id'],
      period: {
        endTimestamp: this.flags['end-timestamp'],
        startTimestamp: this.flags['start-timestamp'],
      },
      sourceId: this.flags['source-id'],
    }

    if (this.flags['dimension-id']) body.dimensionIds = this.flags['dimension-id']
    if (this.flags.filters !== undefined) body.filters = this.parseJsonFlag(this.flags.filters, 'filters', FILTERS_SHAPE)

    const response = await fetchPaginated(this.flags, addSorting({}, this.flags), pageQuery =>
      this.apiClient.post<DrilldownResponse>('/v2/metrics/drilldown', body, this.accountHeaders, {query: pageQuery}), warning => this.warn(warning))

    // The rows come with the schema that describes them, so JSON keeps the whole response.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    // The drilldown schema has no order or visibility: every column shows, in the order given.
    // An empty schema falls back to the first row's keys.
    const schema = response.schema?.items.length
      ? response.schema.items.map((column, order) => ({...column, order, visible: true}))
      : null

    const rows = response.items ?? []
    formatOutput(rows, rowColumns(schema, rows), this.outputFormat)

    showPagination(response.pagination ?? undefined, this.outputFormat)
  }
}
