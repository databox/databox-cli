/**
 * Connection responses shaped as ingestion-api returns them (Contracts/Response/V2/ConnectionResponse.cs),
 * shared by the tests of the commands that read them. Nullable members are present as null.
 */

export const connectionListItem = {
  id: 1,
  integrationKey: 'GoogleAnalytics4',
  managedBy: {id: 31, name: 'Ada'},
  name: 'GA4 Connection',
  sharedWithClients: true,
  statusInfo: {
    description: null, reason: null, status: 'active', userAction: null,
  },
}

export const connectionDetail = {
  ...connectionListItem,
  accessLevel: 'selectedUsers',
  accessList: [{id: 31, name: 'Ada'}],
  createdAt: '2026-01-05T10:00:00+00:00',
  dataSourcesCount: 3,
}
