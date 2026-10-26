/**
 * Dashboard responses shaped as ingestion-api returns them (Contracts/Response/V2/DataboardResponse.cs),
 * shared by the dashboard commands and their deprecated databoard twins.
 */

export {envelope} from '../dataset/fixtures.js'

/** DataboardListItem: a row of GET /v2/dashboards, and what PATCH /v2/dashboards/{id} returns. */
export const dashboardListItem = {
  id: 1, integrationKeys: ['GoogleAnalytics4'], name: 'Marketing Dashboard', tags: ['marketing'],
}

/** DataboardMetricsResponse. */
export const dashboardMetrics = {
  datablocks: [
    {
      id: 100,
      metrics: [
        {
          appliedFilters: {
            groups: [{
              conditions: [{
                field: 'country', operator: 'eq', type: 'dimension', values: ['US', 'UK'],
              }], logicalOperator: 'OR',
            }],
            logicalOperator: 'AND',
          },
          dateRange: {from: '2025-01-01', granularity: 'monthly', to: '2025-12-31'},
          dimensions: [{displayName: 'Country', id: 'country'}],
          id: '500|custom_query_100',
          name: 'Sessions',
          sourceId: 500,
          sourceName: 'Google Analytics',
        },
        {
          appliedFilters: null,
          dateRange: {from: '2025-01-01', granularity: 'daily', to: '2025-01-31'},
          dimensions: [],
          id: 'GoogleAnalytics4@users',
          name: 'Users',
          sourceId: 500,
          sourceName: 'Google Analytics',
        },
      ],
      name: 'Sessions Trend',
      visualizationType: 'line',
    },
    {
      id: 101, metrics: [], name: 'Notes', visualizationType: null,
    },
  ],
}

/** oclif hard-wraps a warning behind a "›" gutter; this joins it back into one line. */
export function unwrapWarning(stderr: string): string {
  return stderr.replaceAll(/^\s*›\s*/gm, '').replaceAll(/\s+/g, ' ')
}
