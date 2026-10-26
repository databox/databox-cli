import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {METRIC_DATA_TIMEOUT_MS} from '../../lib/api-client.js'
import {resolveSourceId} from '../../lib/metric.js'
import {Column, formatOutput, formatSingle} from '../../lib/output.js'

/** MetricsResponse.cs `MetricDataPoint`. `value` is null for a bucket with no data. */
interface MetricDataPoint {
  date: string
  dimensions: Record<string, string>
  value: null | number
}

/**
 * MetricsResponse.cs `MetricSyncInfo`: how current the values are. `status` and `lastSyncedAt` are
 * the platform's (synced, skipped, inProgress, neverSynced, failed, or one added since); `message` is the API's.
 */
interface MetricSyncInfo {
  lastSyncedAt: null | string
  message: string
  status: null | string
}

/**
 * MetricsResponse.cs `MetricDataResult`, with `MetricDataMetricInfo`. `syncInfo` is null for a
 * metric that never syncs, or when the platform could not read its sync state.
 */
interface MetricDataResult {
  dataPoints: MetricDataPoint[]
  metric: {id: string; name: string; sourceId: null | number}
  syncInfo: MetricSyncInfo | null
}

/** MetricsRequests.cs `MetricDataFilterSet`: one flat group, not drilldown's nested groups. */
const FILTERS_SHAPE = '{"logicalOperator":"AND","conditions":[{"type":"dimension","field":"country","operator":"ANY_OF","values":["US"]}]}'

/** MetricsService `MetricDataGranularities`. The API refuses hourly. */
const GRANULARITIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'allTime']

/** A calendar date as the API parses it: `yyyy-MM-dd`, and a day that exists. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export default class MetricData extends BaseCommand<typeof MetricData> {
  static description = `Get a metric's values over a date range

Works for every kind of metric: integration, custom, calculated and pushed. Each point is one --granularity bucket, dated in the source's timezone; a bucket with no data has an empty value. With --dimension-id there is one row per bucket and dimension value, and a column per dimension.

The platform may sync the metric before reading it, so the first call on a metric that has never synced can take about two minutes. The table and CSV are followed by a "Sync:" line on stderr saying how current the values are; --json returns the whole response, with "syncInfo". A 504 means the sync is still running: retry shortly. The API allows 30 calls per account per minute; over it, wait the "Retry after" seconds.

--source-id defaults to the part of --metric-id before "|"; a metric without it, such as "GoogleAnalytics4@sessions", needs --source-id (the sourceId shown by "metric list").`

  static examples = [
    '<%= config.bin %> metric data --metric-id "500|custom_query_100" --from 2026-06-01 --to 2026-06-30 --granularity daily',
    '<%= config.bin %> metric data --metric-id "GoogleAnalytics4@sessions" --source-id 42 --from 2026-01-01 --to 2026-06-30 --granularity monthly --dimension-id country',
    `<%= config.bin %> metric data --metric-id "500|custom_query_100" --from 2026-01-01 --to 2026-12-31 --granularity allTime --filters '${FILTERS_SHAPE}' --json`,
  ]

  static flags = {
    'dimension-id': Flags.string({description: 'Dimension id to break the values down by, from "metric get" (repeat for several)', multiple: true}),
    filters: Flags.string({
      description: `Filters as JSON, one group: {logicalOperator: AND|OR, conditions: [{type: dimension|unit, field, operator, values}]}; operator is ANY_OF, NONE_OF, EQ, NEQ, CONTAINS or NOT_CONTAINS, and both are case-insensitive. E.g. ${FILTERS_SHAPE}`,
    }),
    from: Flags.string({description: 'First day, YYYY-MM-DD', required: true}),
    granularity: Flags.string({description: 'Bucket size; allTime is one bucket for the whole range', options: GRANULARITIES, required: true}),
    'metric-id': Flags.string({description: 'Metric ID', required: true}),
    'source-id': Flags.integer({
      description: 'The data source or dataset the metric belongs to. Defaults to the part of --metric-id before "|"; if given, it must match it. Required for a metric id without one',
    }),
    to: Flags.string({description: 'Last day, YYYY-MM-DD, on or after --from', required: true}),
  }

  async run(): Promise<void> {
    const {
      'dimension-id': dimensionIds, filters, from, granularity, 'metric-id': metricId, 'source-id': givenSourceId, to,
    } = this.flags
    this.requireMetricId(metricId, 'Metric ID')

    // The API rejects these too, but checking here fails before a call that counts against the rate limit.
    for (const [flag, value] of [['from', from], ['to', to]]) {
      if (!isCalendarDate(value)) this.error(`--${flag} must be a date as YYYY-MM-DD, e.g. 2026-06-01.`, {exit: 2})
    }

    if (from > to) this.error('--from must be on or before --to.', {exit: 2})

    const body: Record<string, unknown> = {
      dateRange: {from, granularity, to},
      sourceId: resolveSourceId(
        metricId,
        givenSourceId,
        '--source-id is required: --metric-id has no data source or dataset before "|". Take it from the sourceId in "metric list".',
      ),
    }

    if (dimensionIds) body.dimensionIds = dimensionIds
    if (filters !== undefined) body.filters = this.parseJsonFlag(filters, 'filters', FILTERS_SHAPE)

    const response = await this.apiClient.post<MetricDataResult>(
      `/v2/metrics/${encodeURIComponent(metricId)}/data`,
      body,
      this.accountHeaders,
      {timeoutMs: METRIC_DATA_TIMEOUT_MS},
    )

    // syncInfo says how current the values are, so JSON keeps the whole response.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    const points = response.dataPoints ?? []
    const dimensionKeys = [...new Set(points.flatMap(point => Object.keys(point.dimensions ?? {})))]
    const columns: Column<MetricDataPoint>[] = [
      {header: 'Date', key: 'date'},
      {header: 'Value', key: 'value'},
      ...dimensionKeys.map(id => ({get: (point: MetricDataPoint) => point.dimensions?.[id] ?? '', header: id})),
    ]
    formatOutput(points, columns, this.outputFormat)

    // On stderr, so a CSV stream stays parseable.
    const {message, status} = response.syncInfo ?? {}
    this.logToStderr(`Sync: ${status ?? 'unknown'}${message ? ` — ${message}` : ''}`)
  }
}
