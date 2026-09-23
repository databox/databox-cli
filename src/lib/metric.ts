import {OutputFormat, formatSingle} from './output.js'
import {MetricColumnRef, MetricDetail, MetricFilterGroup} from './types.js'

/** MetricsService.ValidAggregationFunctions: what create accepts for aggregationFunction. */
export const AGGREGATION_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count']

/** A measure, date or dimension reference (MetricsRequests.cs `MetricFieldRef`), as shown in help and parse errors. */
export const REF_SHAPE = '{"id":"amount","displayName":"Amount"}'

/** MetricsRequests.cs `MetricFilterSet`, as shown in help and parse errors. */
export const FILTERS_SHAPE = '{"logicalOperator":"and","conditions":[{"field":"country","operator":"ANY_OF","values":["US","UK"]}]}'

function describeRef(ref: MetricColumnRef | null): string {
  if (!ref) return 'N/A'
  return ref.displayName === ref.id ? ref.id : `${ref.displayName} (${ref.id})`
}

function describeFilters(filters: MetricFilterGroup | null): string {
  if (!filters) return 'N/A'
  if (filters.conditions.length === 0) return 'none'
  return filters.conditions
  .map(({field, operator, values}) => `${field} ${operator} ${values.join(', ')}`)
  .join(` ${filters.logicalOperator} `)
}

function describeVerification(verification: MetricDetail['verificationInfo']): string {
  if (!verification?.isVerified) return 'no'
  const details = [
    verification.verifiedAt ? `at ${verification.verifiedAt}` : '',
    verification.verifiedBy ? `by ${verification.verifiedBy.name}` : '',
  ].filter(Boolean)
  return details.length > 0 ? `yes (${details.join(' ')})` : 'yes'
}

/**
 * Prints a metric, as `metric get` reads it and `metric create`/`update` return it. JSON and CSV
 * are the detail whole; the table spells out the definition. `measure`, `date`, `aggregationFunction`
 * and `filters` are null on integration and push metrics, which have no custom query behind them.
 */
export function printMetricDetail(metric: MetricDetail, format: OutputFormat): void {
  if (format !== 'table') {
    formatSingle(metric, format)
    return
  }

  const lines: Array<[string, string]> = [
    ['ID', metric.id],
    ['Name', metric.name],
    ['Type', metric.type],
    ['Source ID', String(metric.sourceId ?? 'N/A')],
    ['Measure', describeRef(metric.measure)],
    ['Date', describeRef(metric.date)],
    ['Aggregation', metric.aggregationFunction ?? 'N/A'],
    ['Filters', describeFilters(metric.filters)],
    ['Dimensions', metric.dimensions.map(dimension => dimension.displayName).join(', ') || 'none'],
    ['Granularities', metric.availableGranularities.join(', ') || 'none'],
    ['Aggregatable', metric.isAggregatable ? 'yes' : 'no'],
    ['Drilldown', metric.supportsDrilldown ? 'yes' : 'no'],
    ['Verified', describeVerification(metric.verificationInfo)],
  ]

  for (const [label, value] of lines) console.log(`${label}: ${value}`)
}
