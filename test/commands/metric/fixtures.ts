/**
 * Metric responses shaped as ingestion-api returns them (Contracts/Response/V2/MetricsResponse.cs),
 * shared by the tests of every command that reads them. Nullable members are present as null,
 * as the API writes them.
 */

export {envelope} from '../dataset/fixtures.js'

/** A calculated column's key is machine-generated, which is why the display name is carried beside it. */
export const metricListItem = {
  dimensions: [{displayName: 'Country', id: 'country'}, {displayName: 'Order channel', id: 'calc_8f3a'}],
  id: '42|custom_query_1',
  name: 'Revenue',
  sourceId: 42,
  supportsDrilldown: true,
  verificationInfo: {isVerified: true},
}

/** A custom-query metric, which carries its definition. */
export const metricDetail = {
  ...metricListItem,
  aggregationFunction: 'sum',
  availableGranularities: ['daily', 'weekly', 'monthly'],
  date: {displayName: 'Created At', id: 'created_at'},
  filters: {conditions: [{field: 'country', operator: 'ANY_OF', values: ['US', 'UK']}], logicalOperator: 'and'},
  isAggregatable: true,
  measure: {displayName: 'Amount', id: 'amount'},
  type: 'event',
  verificationInfo: {isVerified: true, verifiedAt: '2026-09-01T08:00:00+00:00', verifiedBy: {id: 31, name: 'Ada'}},
}

/** An integration metric: no custom query behind it, so no definition, and no drilldown. */
export const integrationMetricDetail = {
  aggregationFunction: null,
  availableGranularities: [],
  date: null,
  dimensions: [],
  filters: null,
  id: 'GoogleAnalytics4@sessions',
  isAggregatable: true,
  measure: null,
  name: 'Sessions',
  sourceId: 77,
  supportsDrilldown: false,
  type: 'unknown',
  verificationInfo: {isVerified: false, verifiedAt: null, verifiedBy: null},
}
