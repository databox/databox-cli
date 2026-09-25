# Changelog

## 1.0.0 — V2 API

**Breaking change.** The CLI now uses the Databox V2 API exclusively; every V1 call is gone. It needs your personal Databox API key (`pak_…`), created under **Account Management → Security**. Creating one takes an admin role and a plan that includes API access; see [Getting an API Key](https://github.com/databox/databox-cli#getting-an-api-key).

What breaks for a 0.x user, in short:

- **Dataset IDs are numeric.** GUIDs are rejected. Find the new ID with `databox dataset list`, or see [Finding IDs](https://github.com/databox/databox-cli#finding-ids).
- **`--title` is now `--name`** on `data-source create` and `dataset create`.
- **`dataset create --primary-keys` is now `--primary-key`** (still repeatable), and each `--schema` column is `{"id", "dataType"}` instead of `{"name", "dataType"}`.
- **`data-source create --key` is now `--integration-key`.**
- **Your organization has its own topic, and `account` means the accounts in it.** `organization info`, `organization update`, `organization usage` and `organization timezones` cover your organization; `account list` lists the accounts in it. `account data-sources` and `account datasets` are gone: use `data-source list` and `dataset list`, with `--account-id`, now a global flag, to target an account on any command.
- **JSON output uses the V2 API's field names.** Scripts that parse `--json` output need updating; see "JSON Output" below.
- **Lists are paginated.** 0.x printed every item; 1.0 prints the first page unless you pass `--all`. See [List Flags](https://github.com/databox/databox-cli#list-flags).
- **Off a terminal, a prompt needs piped input.** A delete, purge or clear without `--force` reads its `y`/`yes` from stdin, as before, and `auth login` without `--api-key` now reads the key from stdin. When nothing is piped, both exit 2 and do nothing. See [Authentication](https://github.com/databox/databox-cli#authentication) and [Errors and Exit Codes](https://github.com/databox/databox-cli#errors-and-exit-codes).

Beyond that, 1.0.0 adds commands across the whole V2 API, CSV output, `--all` pagination, `--verbose` tracing, idempotent retries, and structured errors with distinct exit codes. The [README](https://github.com/databox/databox-cli#readme) is the reference for all of it; this guide lists what changed.

### Migration Guide

#### Authentication

`databox auth login` at a terminal, the stored key in `~/.config/databox-cli/config.json`, and the `DATABOX_API_KEY` environment variable work as before. New: off a terminal, `auth login` reads the key from stdin (`pass show databox | databox auth login`), and exits 2 when nothing is piped. See [Authentication](https://github.com/databox/databox-cli#authentication) for the details, including when the key is saved.

#### Command Changes — Where Did My Stuff Go?

Every 0.x command maps to a 1.0 command:

| v0.x command | v1.0 equivalent | What changed |
|---|---|---|
| `account list` | `account list` | **Changed.** Lists the accounts in your organization, which `account get`, `create`, `update` and `delete` manage. It works only for an organization that manages accounts; any other gets an error, and reads its own details with `organization info`. To act inside an account, pass `--account-id` to any command. |
| `account data-sources ACCOUNTID` | `data-source list` | **Removed.** Use `data-source list`, with `--account-id` to target an account in your organization. |
| `account datasets ACCOUNTID` | `dataset list` | **Removed.** Use `dataset list`, with `--account-id` to target an account in your organization. The `--type` filter is gone; `--data-source-id`, `--search` and `--sort-by` are new. |
| `account timezones` | `organization timezones` | **Moved** to the `organization` topic. |
| `data-source create` | `data-source create` | `--title` → `--name`. `--key` → `--integration-key` (for third-party integrations such as Datadoo; omit it for a normal ingestion data source, since it now sets the integration type rather than a free-form key). `--account-id` is now the global flag. |
| `data-source datasets ID` | `data-source datasets ID` | Now paginated, and takes `--search`, `--sort-by` and `--sort-order`. |
| `data-source delete ID` | `data-source delete ID` | No change. |
| `dataset create` | `dataset create` | `--title` → `--name`. `--primary-keys` → `--primary-key` (repeat for several). Schema columns are `{"id", "dataType"}`; see the schema example below. |
| `dataset get GUID` | `dataset get NUMERIC_ID` | **IDs are now numeric.** |
| `dataset delete GUID` | `dataset delete NUMERIC_ID` | **IDs are now numeric.** |
| `dataset ingest GUID` | `dataset ingest NUMERIC_ID` | **IDs are now numeric.** |
| `dataset ingestion GUID ING_ID` | `dataset ingestion NUMERIC_ID ING_ID` | **The dataset ID is now numeric.** The ingestion ID is the UUID that `dataset ingest` returns. |
| `dataset ingestions GUID` | `dataset ingestions NUMERIC_ID` | **IDs are now numeric.** |
| `dataset purge GUID` | `dataset purge NUMERIC_ID` | **IDs are now numeric.** |
| `analyze ask-genie` | `analyze ask-genie` | No change. |

#### Schema Definition Change

v0.x:
```bash
--schema '[{"name":"date","dataType":"datetime"},{"name":"value","dataType":"number"}]'
```

v1.0:
```bash
--schema '[{"id":"date","dataType":"datetime"},{"id":"value","dataType":"number"}]'
```

`dataType` is one of `string`, `number` or `datetime`. The column `id` is also how you refer to the column everywhere else: in `--primary-key`, in metric column references, and in modifications.

#### Dataset ID Migration

0.x used GUIDs for datasets (e.g. `a1b2c3d4-e5f6-...`). 1.0 uses numeric IDs (e.g. `12345`) and rejects anything else with exit code 2. To find the numeric ID of an existing dataset:

```bash
databox dataset list --search "My Dataset"
```

The README's [Finding IDs](https://github.com/databox/databox-cli#finding-ids) explains every ID the CLI takes, including where the Databox app shows them.

#### Agent Skills

The bundled skills follow the new topics. 0.3.1's `databox-accounts` covered account listing, timezones, and an account's data sources and datasets. In 1.0.0:

- `databox-organization` covers your organization: details, usage, settings and timezones.
- `databox-accounts` covers the accounts in your organization: listing, creating, updating and deleting them.
- `databox-data-sources` and `databox-datasets` cover listing data sources and datasets, with `--account-id` for an account.
- `databox-metrics`, `databox-users`, `databox-connections`, `databox-integrations` and `databox-billing` are new.

Reinstall them with `npx skills add databox/databox-cli --skill '*'`.

#### JSON Output

`--json` still prints JSON on every command, but the objects are the V2 API's own. For example, `dataset ingestions` items carry `id`, `initiatedAt`, `status`, `duration` and `initiatedBy`, and `data-source datasets` items carry `id`, `name`, `dataSourceId`, `createdAt`, `lastActivityAt` and status details. Check the output of the commands your scripts use.

A list prints a bare array of the API's items; a few commands print the whole response object. The rules are under [Output Formats](https://github.com/databox/databox-cli#output-formats).

#### Summary of Removed Features

| Feature | Why | Alternative |
|---|---|---|
| Listing accounts across organizations (`account list`) | V2 scopes every call to one organization or account | `account list` for the accounts in your organization, `organization info` for your own |
| `--type` filter on dataset listing | Not part of the V2 API | `dataset list`, optionally filtered by `--data-source-id` or `--search` |
| GUID dataset IDs | V2 identifies datasets and data sources by numeric ID | `dataset list` to find the numeric ID |
| `ACCOUNTID` positional argument | Replaced by account scoping on every command | The global `--account-id` flag |

### New Flags

- **On every command** except `auth login`: `--output table|json|csv` (CSV is new), `--verbose` (request tracing on stderr), `--no-color`, and `--account-id` / `DATABOX_ACCOUNT_ID`, which replaces 0.x's `ACCOUNTID` argument. See [Global Flags](https://github.com/databox/databox-cli#global-flags).
- **On list commands**: `--page`, `--page-size`, `--all`, and on some `--search`, `--sort-by` and `--sort-order`. See [List Flags](https://github.com/databox/databox-cli#list-flags).
- **`--idempotency-key <uuid>`** on `account create`, `data-source create`, `data-source purge`, `dataset create`, `dataset duplicate`, `dataset ingest`, `dataset purge`, `dataset update-modification`, `metric create` and `user invite`: a retry with the same key within 24 hours returns the first response instead of repeating the action.

### Errors and Exit Codes

An API error now prints its code, message, the field at fault and the request ID on stderr, and exit codes tell failures apart: `1` for an API error, `2` for input that never reached the API or a network failure, `130` for Ctrl-C at a prompt. See [Errors and Exit Codes](https://github.com/databox/databox-cli#errors-and-exit-codes).

An empty flag value is never silently ignored: `--schema ""`, `--records ""`, `--file ""` and `--integration-key ""` fail with exit 2, as does a blank `--name`, and `--timezone ""` is sent for the API to reject. A redirect from the API is refused with exit 2 rather than followed, since following it would resend your API key.

### New Commands

91 commands in all, covering the V2 API. New in 1.0.0:

#### Organization
- `organization info` — Show your organization's details
- `organization update` — Update the organization name, company, address, billing details, metadata and settings (date and number format, first day of week, `gregorian`/`customFiscal`/`weekAlignedFiscal` calendar)
- `organization usage` — Show usage statistics: users, data sources, accounts and AI credits
- `organization countries` — List available countries
- `organization metadata-options` — List the metadata options for organization settings

With `--account-id`, the `organization` commands answer for that account.

#### Profile
- `profile info` — Show your profile, with your organization and, if you belong to one, your home account
- `profile update` — Update your name, timezone or metadata (department, title, role)
- `profile metadata-options` — List the departments and roles `profile update --metadata` accepts

#### Billing
- `billing info` — Show plan and billing details
- `billing invoices` — List invoices, with amounts in USD

#### Users
- `user list` — List users, filtered by `--role` or `--search`
- `user get` — Get user details
- `user invite` — Invite a user with `--role admin|user|editor|viewer`
- `user update` — Change a user's name or role
- `user delete` — Remove a user

#### Accounts (organizations that manage accounts)
- `account get` — Get account details
- `account create` — Create an account
- `account update` — Update an account's name, manager or website
- `account delete` — Delete an account

#### Connections
- `connection list` — List connections
- `connection get` — Get connection details
- `connection update` — Rename a connection
- `connection delete` — Delete a connection
- `connection permissions` — Show permissions
- `connection set-permissions` — Set `--access-level everyone|selectedUsers|private` (with `--access-list` user IDs for `selectedUsers`). `--shared-with-accounts` or `--no-shared-with-accounts` is required, because every call replaces the sharing setting.

#### Integrations
- `integration list` — Browse the integration catalog
- `integration get` — Get integration details

#### Data Sources
- `data-source list` — List data sources, with `--search`, `--connection-id` and sorting
- `data-source get` — Get data source details
- `data-source update` — Rename a data source
- `data-source set-timezone` — Set the timezone, optionally for its datasets too
- `data-source sync-frequency-options` — List the sync intervals the data source can use, and which your plan includes
- `data-source set-sync-frequency` — Set `--interval` in minutes: 1, 15, 60, 240, 360, 480 or 1440. For an ingestion data source this sets how often metrics sync; the data itself arrives when you push it
- `data-source permissions` — Show permissions
- `data-source set-permissions` — Set `--access-level everyone|selectedUsers|private`
- `data-source purge` — Purge all data, keeping the data source

#### Datasets
- `dataset list` — List datasets, with `--search`, `--data-source-id` and sorting
- `dataset update` — Rename a dataset
- `dataset duplicate` — Duplicate a dataset (not supported for datasets created through the API)
- `dataset data` — Page through a dataset's rows, sorted by any column
- `dataset schema` — Show columns and the primary key
- `dataset lineage` — Show what a dataset is built from, and what is built from it
- `dataset set-timezone` — Set the timezone
- `dataset sync-frequency-options` — List the sync intervals the dataset can use, and which your plan includes
- `dataset set-sync-frequency` — Set `--interval` in minutes: 1, 15, 60, 240, 360, 480 or 1440. For an ingestion dataset this sets how often metrics sync; the data itself arrives when you push it
- `dataset sync-history` — Show sync history
- `dataset sync-statistics` — Show sync statistics
- `dataset ingestion-statistics` — Show ingestion statistics
- `dataset permissions` — Show permissions
- `dataset set-permissions` — Set `--access-level everyone|selectedUsers|private`
- `dataset metadata` — Show the description, synonyms and default time dimension
- `dataset set-metadata` — Update them
- `dataset column-metadata` — Show per-column descriptions, concept types and synonyms
- `dataset set-column-metadata` — Update them, by column `id`
- `dataset verification` — Show verification status
- `dataset set-verification` — Mark a dataset verified or unverified
- `dataset modifications` — Show the modification definition: filters, formulas, display names, data types, column order and visibility
- `dataset update-modification` — Create or replace the modification definition. It replaces the whole definition; to change part of it, start from `dataset modifications ID --json`.
- `dataset preview-modification` — Preview a definition on up to 200 rows without saving it
- `dataset clear-modifications` — Remove all modifications
- `dataset modification-rules` — List the filter operators and type conversions modifications accept
- `dataset modification-functions` — List the functions modification formulas can use

#### Metrics
- `metric list` — List metrics, filtered by `--source-id` (a data source or dataset) or `--search`
- `metric get` — Get a metric's details, including a custom metric's measure, date, aggregation and filters
- `metric create` — Create a custom metric on a dataset. `--measure`, `--date` and `--dimension` take column references as `{"id","displayName"}`; `--filters` takes one group, `{"logicalOperator":"and","conditions":[{"field","operator","values"}]}`; `--aggregation-function` is `sum`, `avg`, `min`, `max` or `count`.
- `metric update` — Update a custom metric; `--clear-dimensions` removes all its dimensions
- `metric delete` — Delete a custom metric
- `metric drilldown` — Get the rows behind a metric's value for a period, by `--source-id`, with repeatable `--dimension-id` and `--filters` as `databoard metrics` reports them. Its `--filters` is a **different shape** from `metric create`'s; [JSON Input](https://github.com/databox/databox-cli#json-input) has an example of each
- `metric dimension-values` — List the values of one dimension (`--metric-id`, `--source-id`, `--dimension-id`)
- `metric lineage` — Show what a metric is built from, and which calculated metrics read it
- `metric usages` — Show where a custom metric is used (databoards, alerts, goals, reports and more)
- `metric verification` — Show verification status
- `metric set-verification` — Mark a metric verified or unverified

#### Databoards
- `databoard list` — List databoards
- `databoard metrics` — List the metrics on a databoard's datablocks, with their dimensions, date range and filters

#### Activity Log
- `activity-log list` — List activity log entries, filtered by date, `--resource-type`, `--user-id` or `--search`

### Unchanged

- `auth validate`, and `auth login` at a terminal
- `analyze ask-genie` — Genie AI questions about a dataset
- The config file location, `~/.config/databox-cli/config.json`
- The `DATABOX_API_KEY` and `DATABOX_API_URL` environment variables
