# Changelog

## 1.0.0 — V2 API Migration

**Breaking change**: The CLI now exclusively uses the Databox V2 API. All V1 API calls have been removed. This requires a Databox account with V2 API access.

- **Activity log** nested under account — `activity-log list` now calls `/v2/account/activity-log` (was `/v2/activity-log`). The command name is unchanged.
- **New command** — `profile metadata-options` returns available departments and roles for profile metadata updates.

### Migration Guide

#### Authentication

No changes to the authentication flow. API keys work the same way — `databox auth login` and the `DATABOX_API_KEY` environment variable continue to work as before.

#### Command Changes — Where Did My Stuff Go?

Every v0.x command is still supported in some form. Here's exactly where each one moved and what changed:

| v0.x Command | v1.0 Equivalent | What Changed |
|---|---|---|
| `account list` | `account info` | **Renamed.** V2 returns your own account as a single object. To list accounts you manage, use `client list` (agency/client model). To access a specific account's resources, pass `--account-id` on any command. |
| `account data-sources ACCOUNTID` | `data-source list` or `account data-sources --account-id ID` | **Positional arg removed.** The `ACCOUNTID` arg is replaced by the global `--account-id` flag. Omit it to use your own account. The new `data-source list` command is the preferred way. |
| `account datasets ACCOUNTID` | `dataset list` or `account datasets --account-id ID` | **Same as above.** The new `dataset list` is preferred. `--type` filter removed — merged datasets are not in V2 (deferred to backlog). |
| `account timezones` | `account timezones` | No changes. |
| `data-source create` | `data-source create` | `--account-id` is now a global flag (works on all commands). `--key` flag preserved for third-party integrations (e.g., Datadoo). |
| `data-source datasets ID` | `data-source datasets ID` | No user-facing changes. |
| `data-source delete ID` | `data-source delete ID` | No changes. |
| `dataset create` | `dataset create` | `--primary-keys` renamed to `--primary-key` (singular, still accepts multiple values). Schema column field `name` renamed to `columnId`. See schema example below. |
| `dataset get GUID` | `dataset get NUMERIC_ID` | **IDs are now numeric.** Use `dataset list` to find your dataset's numeric ID. |
| `dataset delete GUID` | `dataset delete NUMERIC_ID` | **IDs are now numeric.** |
| `dataset ingest GUID` | `dataset ingest NUMERIC_ID` | **IDs are now numeric.** |
| `dataset ingestion GUID ING_ID` | `dataset ingestion NUMERIC_ID ING_ID` | **Dataset ID is now numeric.** Ingestion ID unchanged. |
| `dataset ingestions GUID` | `dataset ingestions NUMERIC_ID` | **IDs are now numeric.** |
| `dataset purge GUID` | `dataset purge NUMERIC_ID` | **IDs are now numeric.** |
| `analyze ask-genie` | `analyze ask-genie` | No changes (uses separate agentic service). |

#### New Global Flag

| Flag | Env Var | Description |
|---|---|---|
| `--account-id` | `DATABOX_ACCOUNT_ID` | Target a specific account for multi-account access (agency/client model). Replaces the `ACCOUNTID` positional arg from v0.x. Works on all commands. |

#### Schema Definition Change

v0.x:
```bash
--schema '[{"name":"date","dataType":"datetime"},{"name":"value","dataType":"number"}]'
```

v1.0:
```bash
--schema '[{"columnId":"date","dataType":"datetime"},{"columnId":"value","dataType":"number"}]'
```

The `name` field was renamed to `columnId` to match the V2 API contract.

#### Dataset ID Migration

V1 used GUID identifiers for datasets (e.g., `a1b2c3d4-e5f6-...`). V2 uses numeric IDs (e.g., `12345`). The CLI now validates that dataset IDs are numeric and rejects non-numeric values with a clear error.

To find the numeric ID for an existing dataset:
```bash
databox dataset list
```

#### Summary of Removed Features

| Feature | Why | Alternative |
|---|---|---|
| Multi-account listing (`account list`) | V2 scopes to the caller's account | `client list` for managed accounts, `account info` for your own |
| `--type` filter on dataset listing | Merged datasets deferred to backlog | All datasets are regular datasets in V2 |
| GUID dataset IDs | Architectural decision — numeric IDs unify data sources and datasets | Use `dataset list` to find numeric IDs |
| `ACCOUNTID` positional arg | Replaced by header-based account scoping | `--account-id` flag (global, works everywhere) |

### New Commands

65+ new commands covering the full V2 API surface:

#### Account
- `account info` — Show your account details
- `account update` — Update account name/settings
- `account usage` — Show usage statistics
- `account timezones` — List supported timezones
- `account data-sources` — List data sources
- `account datasets` — List datasets

#### Profile
- `profile info` — Show your profile
- `profile update` — Update your name or timezone

#### Billing
- `billing info` — Show billing and plan details
- `billing invoices` — List invoices

#### Users
- `user list` — List users in the account
- `user get` — Get user details
- `user invite` — Invite a new user
- `user update` — Update a user's role
- `user delete` — Remove a user

#### Clients
- `client list` — List client accounts
- `client get` — Get client account details
- `client create` — Create a client account
- `client update` — Update a client account
- `client delete` — Delete a client account

#### Connections
- `connection list` — List connections
- `connection get` — Get connection details
- `connection update` — Update a connection
- `connection delete` — Delete a connection
- `connection permissions` — Show permissions
- `connection set-permissions` — Update permissions

#### Integrations
- `integration list` — Browse available integrations
- `integration get` — Get integration details

#### Data Sources (new sub-commands)
- `data-source list` — List data sources with search and pagination
- `data-source get` — Get data source details
- `data-source update` — Update data source title
- `data-source set-timezone` — Set timezone
- `data-source sync-frequencies` — List available sync frequencies
- `data-source set-sync-frequency` — Set sync frequency
- `data-source permissions` — Show permissions
- `data-source set-permissions` — Update permissions
- `data-source purge` — Purge all data

#### Datasets (new sub-commands)
- `dataset list` — List datasets with search and pagination
- `dataset update` — Update dataset title
- `dataset duplicate` — Duplicate a dataset
- `dataset data` — View dataset data
- `dataset schema` — View dataset schema
- `dataset set-timezone` — Set timezone
- `dataset sync-frequencies` — List available sync frequencies
- `dataset set-sync-frequency` — Set sync frequency
- `dataset sync-history` — View sync history
- `dataset permissions` — Show permissions
- `dataset set-permissions` — Update permissions
- `dataset metadata` — View metadata
- `dataset set-metadata` — Update metadata
- `dataset column-metadata` — View column metadata
- `dataset set-column-metadata` — Update column metadata
- `dataset verification` — View verification status
- `dataset set-verification` — Toggle verification
- `dataset modifications` — List modifications
- `dataset add-modification` — Add a modification
- `dataset update-modification` — Update a modification
- `dataset clear-modifications` — Clear all modifications
- `dataset preview-modification` — Preview a modification before applying
- `dataset modification-rules` — List available modification rules
- `dataset modification-formulas` — List available modification formulas
- `dataset ingestion-statistics` — View ingestion statistics
- `dataset sync-statistics` — View sync history statistics
- `dataset lineage` — Show dataset parents and children

#### Metrics
- `metric list` — List metrics
- `metric get` — Get metric details
- `metric create` — Create a custom metric
- `metric update` — Update a metric
- `metric delete` — Delete a metric
- `metric data` — Load metric data
- `metric dimension-values` — Get dimension values
- `metric drilldown` — Get drilldown data
- `metric usages` — See where a metric is used
- `metric verification` — View verification status
- `metric set-verification` — Toggle verification

#### Activity Log
- `activity-log list` — List activity log entries

#### Databoards
- `databoard list` — List databoards
- `databoard metrics` — View metrics on a databoard

### Unchanged

- `auth login` — Authentication flow unchanged
- `auth validate` — Key validation unchanged
- `analyze ask-genie` — Genie AI integration unchanged (uses separate agentic service)
- `--json` flag — Works the same on all commands
- Config file location — `~/.config/databox-cli/config.json` unchanged
- `DATABOX_API_KEY` / `DATABOX_API_URL` env vars — Work the same
