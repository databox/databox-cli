/**
 * Response shapes used by more than one command, mirrored field for field from ingestion-api's
 * `src/IngestionApi.Core/Contracts/Response/V2/`. The API writes nulls rather than omitting them,
 * so a nullable C# member is `T | null` here, and a date (DateTimeOffset) is an ISO string.
 * Single-use shapes stay in their command.
 */

/** Common.cs `UserRef`. */
export interface UserRef {
  id: number
  name: string
}

/** DatasetResponse.cs `DatasetStatusInfo`; DataSourceResponse.cs `DataSourceStatusInfo` has the same fields. */
export interface StatusInfo {
  description: null | string
  errorType: null | string
  reason: null | string
  status: string
  statusCode: null | string
  userAction: null | string
}

/** DatasetResponse.cs `DatasetSyncInfo`: the last sync, which is what the app's status badge reads. */
export interface SyncInfo {
  initiatedAt: null | string
  lastSuccessfulSyncAt: null | string
  status: null | string
  type: null | string
}

/**
 * DatasetResponse.cs `LineageNode`, returned by both dataset and metric lineage. `id` is a string
 * because a metric is identified by its key; read `type` to know what it names.
 */
export interface LineageNode {
  id: string
  name: string
  type: string
}

/** Common.cs `SyncFrequencyItem`, the items of the dataset and data-source sync-frequency-options. */
export interface SyncFrequencyOption {
  availability: string
  isDefault: boolean
  isSelected: boolean
  label: string
  syncInterval: number
}

/**
 * DatasetResponse.cs `DatasetPermissions`; DataSourceResponse.cs `DataSourcePermissionsResponse`
 * has the same fields. `accessList` is null unless `accessLevel` is `selectedUsers`.
 */
export interface Permissions {
  accessLevel: string
  accessList: UserRef[] | null
}

/** DatasetResponse.cs `DatasetVerificationSummary` and MetricsResponse.cs `MetricVerificationSummary`. */
export interface VerificationSummary {
  isVerified: boolean
}

/** DatasetResponse.cs `DatasetVerificationDetail` and MetricsResponse.cs `MetricVerificationDetail`. */
export interface VerificationDetail extends VerificationSummary {
  verifiedAt: null | string
  verifiedBy: UserRef | null
}

/** DatasetResponse.cs `DatasetIngestionSummary`. */
export interface DatasetIngestionSummary {
  lastIngestionAt: null | string
  lastStatus: null | string
}

/** DatasetResponse.cs `DatasetIngestionDetail`. */
export interface DatasetIngestionDetail {
  initiatedAt: null | string
  lastSuccessfulIngestionAt: null | string
  status: null | string
}

/** DatasetResponse.cs `DatasetListItem`, a row of GET /v2/datasets and the base of DatasetDetail. */
export interface DatasetListItem {
  createdAt: null | string
  dataSourceId: null | number
  id: number
  ingestionInfo: DatasetIngestionSummary | null
  ingestionSupported: boolean
  lastActivityAt: null | string
  name: string
  statusInfo: StatusInfo | null
  syncInfo: SyncInfo | null
  timezone: null | string
  verificationInfo: VerificationSummary | null
}

/**
 * DatasetResponse.cs `DatasetDetail`, returned by get, create and duplicate and by the dataset
 * mutations that answer with the resource. It redeclares `ingestionInfo` and `verificationInfo`
 * (C# `new`) with richer types, which is why the base is taken without them.
 */
export interface DatasetDetail extends Omit<DatasetListItem, 'ingestionInfo' | 'verificationInfo'> {
  columnCount: number
  ingestionInfo: DatasetIngestionDetail | null
  managedBy: UserRef | null
  /** The storage limit in bytes; null when the dataset has never synced. */
  maxSize: null | number
  rowCount: number
  /** Bytes the dataset occupies. */
  size: null | number
  syncInterval: null | number
  verificationInfo: VerificationDetail | null
}

/** DataSourceResponse.cs `DataSourceListItem`, a row of GET /v2/data-sources and the base of DataSourceDetail. */
export interface DataSourceListItem {
  connectionId: null | number
  createdAt: null | string
  id: number
  integrationKey: null | string
  lastActivityAt: null | string
  name: string
  statusInfo: StatusInfo
  timezone: null | string
}

/**
 * DataSourceResponse.cs `DataSourceDetail`, returned by get, create and update and by the
 * data-source mutations that answer with the resource.
 */
export interface DataSourceDetail extends DataSourceListItem {
  managedBy: UserRef | null
  /** Minutes between syncs; null when neither a custom nor a selected interval is known. */
  syncInterval: null | number
}

/** ConnectionResponse.cs `ConnectionPermissions`, read by permissions and returned by set-permissions. */
export interface ConnectionPermissions extends Permissions {
  sharedWithAccounts: boolean
}

/** ConnectionResponse.cs `ConnectionStatusInfo`. */
export interface ConnectionStatusInfo {
  description: null | string
  reason: null | string
  status: string
  userAction: null | string
}

/** ConnectionResponse.cs `ConnectionListItem`, a row of GET /v2/connections and the base of ConnectionDetail. */
export interface ConnectionListItem {
  id: number
  integrationKey: null | string
  managedBy: UserRef | null
  name: string
  sharedWithAccounts: boolean
  statusInfo: ConnectionStatusInfo
}

/**
 * ConnectionResponse.cs `ConnectionDetail`, returned by get and update. `accessList` is null unless
 * `accessLevel` is `selectedUsers`.
 */
export interface ConnectionDetail extends ConnectionListItem {
  accessLevel: string
  accessList: UserRef[] | null
  createdAt: null | string
  dataSourcesCount: number
}

/** ClientResponse.cs `ClientListItem`, published as `AccountListItem`: a row of GET /v2/accounts. */
export interface AccountListItem {
  id: number
  isSelfManaged: boolean
  managedBy: UserRef | null
  name: string
}

/**
 * ClientResponse.cs `ClientDetail`, published as `AccountDetail`, returned by account get, create and
 * update. The C# class repeats ClientListItem's members rather than inheriting them; the `extends`
 * here follows the CLI rule that a detail type extends its list item.
 */
export interface AccountDetail extends AccountListItem {
  companyName: null | string
  createdAt: null | string
  websiteUrl: null | string
}

/** ProfileResponse.cs `ProfileMetadataModel`: the job details, not the user's role. */
export interface ProfileMetadata {
  department: null | string
  role: null | string
  title: null | string
}

/**
 * ProfileResponse.cs `OrganizationRef`: the organization the user belongs to. `name` is null when
 * the name lookup failed, and `id` is null when an account-level user's organization could not be
 * resolved.
 */
export interface OrganizationRef {
  id: null | number
  name: null | string
}

/** ProfileResponse.cs `AccountRef`: an account within an organization. `name` is null when the name lookup failed. */
export interface AccountRef {
  id: number
  name: null | string
}

/**
 * ProfileResponse.cs `ProfileResponse`, read by profile info and returned by profile update.
 * `role` is the user's role (admin, user, editor or viewer); `metadata.role` is the job role.
 * `account` is the user's home account, null for a user at the organization level; neither it
 * nor `organization` follows --account-id.
 */
export interface ProfileResponse {
  account: AccountRef | null
  createdAt: string
  email: string
  id: number
  isEmailVerified: boolean
  metadata: ProfileMetadata | null
  name: string
  organization: OrganizationRef
  role: string
  timezone: null | string
}

/** UserResponse.cs `UserListItem`, a row of GET /v2/users and the response of user invite. */
export interface UserListItem {
  email: string
  id: number
  name: string
  role: string
}

/** UserResponse.cs `UserDetail`, returned by user get and update. Declared on its own in C#, not extending the list item. */
export interface UserDetail {
  createdAt: null | string
  email: string
  id: number
  isAdminApproved: boolean
  isEmailVerified: boolean
  lastSeenAt: null | string
  metadata: ProfileMetadata | null
  name: string
  role: string
  timezone: null | string
}

/** IntegrationResponse.cs `IntegrationListItem`, a row of GET /v2/integrations and the base of IntegrationDetail. */
export interface IntegrationListItem {
  id: number
  key: string
  name: string
  supportsDatasets: boolean
}

/** IntegrationResponse.cs `IntegrationDetail`. */
export interface IntegrationDetail extends IntegrationListItem {
  avatar: null | string
  categories: string[]
  description: null | string
  supportsMetricBuilder: boolean
}

/** Common.cs `V2AddressModel`. */
export interface Address {
  city: null | string
  country: null | string
  state: null | string
  street: null | string
  zip: null | string
}

/** Common.cs `V2AccountSettingsModel`: the organization's settings. */
export interface OrganizationSettings {
  /** gregorian, customFiscal or weekAlignedFiscal. */
  calendar: null | string
  dateFormat: null | string
  firstDayOfWeek: null | string
  /** Only for a fiscal calendar; null for gregorian. */
  fiscalYearStart: {day: number; month: number} | null
  numberFormat: null | string
}

/** Common.cs `V2AccountMetadataModel`: the organization's metadata. */
export interface OrganizationMetadata {
  annualRevenue: null | string
  businessType: null | string[]
  companySize: null | string
  industry: null | string[]
}

/**
 * AccountResponse.cs `AccountResponse`, published as `OrganizationResponse`: read by organization
 * info and returned by organization update.
 */
export interface OrganizationResponse {
  address: Address | null
  billingName: null | string
  companyName: null | string
  id: number
  managedBy: UserRef | null
  metadata: OrganizationMetadata | null
  name: string
  settings: OrganizationSettings | null
  taxNumber: null | string
  websiteUrl: null | string
}

/**
 * DatasetResponse.cs `DatasetSchemaColumn`, the columns of dataset schema, data and modification
 * preview. `visible` is false for a column a modification hid.
 */
export interface SchemaColumn {
  dataType: string
  displayName: string
  id: string
  order: number
  visible: boolean
}

/** DatasetResponse.cs `DailyStatistic`, one day of the ingestion and sync statistics. */
export interface DailyStatistic {
  date: string
  status: string
}

/** DatasetResponse.cs `DatasetMetadataResponse`, read by metadata and returned by set-metadata. */
export interface DatasetMetadataResponse {
  defaultTimeDimension: null | string
  description: null | string
  synonyms: null | string[]
}

/** DatasetResponse.cs `ColumnMetadataItem`, read by column-metadata and returned by set-column-metadata. */
export interface ColumnMetadataItem {
  conceptType: null | string
  description: null | string
  displayName: string
  id: string
  synonyms: null | string[]
}

/** ModificationDefinitionModels.cs `ModificationFilter`. `value` is any JSON value, or null. */
export interface ModificationFilter {
  type: string
  value: unknown
}

/** ModificationDefinitionModels.cs `ModificationFilterGroup`: one column's filter. */
export interface ModificationFilterGroup {
  conditions: ModificationFilter[]
  logicalOperator: string
}

/** ModificationDefinitionModels.cs `ModificationDataType`: one column's type cast. */
export interface ModificationDataType {
  inputFormat: null | string
  outputFormat: {scale: null | string; type: null | string} | null
  outputLogicalType: string
}

/**
 * DatasetResponse.cs `DatasetModificationResponse`, returned by GET and PUT modifications. The
 * maps are keyed by column id and are empty, never null, when nothing is set; `order` and
 * `visibility` cover every column of the dataset.
 */
export interface DatasetModification {
  dataTypes: Record<string, ModificationDataType>
  displayNames: Record<string, string>
  filters: Record<string, ModificationFilterGroup>
  formulas: Record<string, string>
  order: string[]
  visibility: Record<string, boolean>
}

/** MetricsResponse.cs `MetricDimension`. */
export interface MetricDimension {
  displayName: string
  id: string
}

/** MetricsResponse.cs `MetricColumnRef`: a column the metric is built on. */
export interface MetricColumnRef {
  displayName: string
  id: string
}

/** MetricsResponse.cs `MetricDefinitionFilter`. */
export interface MetricDefinitionFilter {
  field: string
  operator: string
  values: string[]
}

/** MetricsResponse.cs `MetricFilterGroupResponse`: one group with a shared operator. */
export interface MetricFilterGroup {
  conditions: MetricDefinitionFilter[]
  logicalOperator: string
}

/** MetricsResponse.cs `MetricListItem`, a row of GET /v2/metrics and the base of MetricDetail. */
export interface MetricListItem {
  dimensions: MetricDimension[]
  id: string
  name: string
  sourceId: null | number
  supportsDrilldown: boolean
  verificationInfo: VerificationSummary | null
}

/**
 * MetricsResponse.cs `MetricDetail`. `measure`, `date`, `aggregationFunction` and `filters` are
 * the custom-query definition, null on integration and push metrics. `verificationInfo` is
 * redeclared (C# `new`) with the detail type.
 */
export interface MetricDetail extends Omit<MetricListItem, 'verificationInfo'> {
  aggregationFunction: null | string
  availableGranularities: string[]
  date: MetricColumnRef | null
  filters: MetricFilterGroup | null
  isAggregatable: boolean
  measure: MetricColumnRef | null
  type: string
  verificationInfo: VerificationDetail | null
}
