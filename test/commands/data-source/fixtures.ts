/**
 * Data-source responses shaped as ingestion-api returns them (Contracts/Response/V2/DataSourceResponse.cs),
 * shared by the tests of every command that reads them. Nullable members are present as null,
 * as the API writes them.
 */

export const dataSourceListItem = {
  connectionId: 7,
  createdAt: '2026-01-05T10:00:00+00:00',
  id: 42,
  integrationKey: 'DataboxAPI',
  lastActivityAt: '2026-09-01T08:00:00+00:00',
  name: 'My Source',
  statusInfo: {
    description: 'The connection credentials are no longer valid.',
    errorType: 'connection',
    reason: 'Invalid credentials',
    status: 'error',
    statusCode: 'invalidCredentials',
    userAction: 'Reconnect the data source.',
  },
  timezone: 'UTC',
}

export const dataSourceDetail = {
  ...dataSourceListItem,
  managedBy: {id: 31, name: 'Ada'},
  syncInterval: 60,
}
