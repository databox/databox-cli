/**
 * Dataset responses shaped as ingestion-api returns them (Contracts/Response/V2/DatasetResponse.cs),
 * shared by the tests of every command that reads them. Nullable members are present as null,
 * as the API writes them.
 */

export const datasetListItem = {
  createdAt: '2026-01-05T10:00:00+00:00',
  dataSourceId: 42,
  id: 123,
  ingestionInfo: {lastIngestionAt: '2026-09-01T08:00:00+00:00', lastStatus: 'success'},
  ingestionSupported: true,
  lastActivityAt: '2026-09-01T08:00:00+00:00',
  name: 'Orders',
  statusInfo: {
    description: null, errorType: null, reason: null, status: 'active', statusCode: 'active', userAction: null,
  },
  syncInfo: {
    initiatedAt: '2026-09-01T07:59:00+00:00', lastSuccessfulSyncAt: '2026-09-01T08:00:00+00:00', status: 'success', type: 'scheduledUpdate',
  },
  timezone: 'UTC',
  verificationInfo: {isVerified: false},
}

export const datasetDetail = {
  ...datasetListItem,
  columnCount: 3,
  ingestionInfo: {initiatedAt: '2026-09-01T07:59:00+00:00', lastSuccessfulIngestionAt: '2026-09-01T08:00:00+00:00', status: 'success'},
  managedBy: {id: 31, name: 'Ada'},
  maxSize: 1_073_741_824,
  rowCount: 1500,
  size: 204_800,
  syncInterval: 60,
  verificationInfo: {isVerified: false, verifiedAt: null, verifiedBy: null},
}

/** Three columns, deliberately out of order, one hidden by a modification. */
export const schemaColumns = [
  {
    dataType: 'number', displayName: 'Revenue', id: 'amount', order: 1, visible: true,
  },
  {
    dataType: 'datetime', displayName: 'Order date', id: 'orderDate', order: 0, visible: true,
  },
  {
    dataType: 'string', displayName: 'Internal note', id: 'note', order: 2, visible: false,
  },
]

/** A modification definition as GET and PUT modifications return it (DatasetModificationResponse). */
export const modification = {
  dataTypes: {amount: {inputFormat: null, outputFormat: {scale: 'none', type: 'AUTO_DOLLAR'}, outputLogicalType: 'currency'}},
  displayNames: {amount: 'Revenue'},
  filters: {
    amount: {conditions: [{type: 'greater_than', value: 100}, {type: 'is_not_null', value: null}], logicalOperator: 'AND'},
  },
  formulas: {totalWithTax: '$amount * 1.2'},
  order: ['orderId', 'amount', 'totalWithTax'],
  visibility: {amount: true, orderId: false, totalWithTax: true},
}

export function envelope(data: unknown): {data: unknown; requestId: string; status: string} {
  return {data, requestId: 'test', status: 'success'}
}
