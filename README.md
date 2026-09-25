# databox-cli

Command-line interface for the [Databox](https://databox.com) API. Manage data sources, datasets and the data in them, custom metrics, databoards, users, your organization and its accounts, connections and billing — from the terminal, from scripts, or through an AI agent.

Version 1.0 targets the Databox V2 API. Upgrading from 0.x? The [1.0.0 migration guide](https://github.com/databox/databox-cli/blob/main/CHANGELOG.md) lists every renamed command and flag.

## Installation

```bash
npm install -g databox-cli
```

Requires Node.js 18 or later.

## Getting Started

```bash
# Authenticate with your API key, and check it works
databox auth login
databox auth validate

# Create a data source, then a dataset under it with a schema
databox data-source create --name "My App"
databox dataset create --name "Orders" --data-source-id 12345 \
  --primary-key order_id \
  --schema '[{"id":"order_id","dataType":"string"},{"id":"date","dataType":"datetime"},{"id":"country","dataType":"string"},{"id":"amount","dataType":"number"}]'

# Push rows into the dataset: inline, from a file, or piped on stdin
databox dataset ingest 67890 --records '[{"order_id":"A-1","date":"2026-01-15","country":"US","amount":42}]'
databox dataset ingest 67890 --file orders.json
cat orders.json | databox dataset ingest 67890

# Check what arrived
databox dataset ingestions 67890
databox dataset data 67890

# Build a custom metric on the dataset. Column references are {"id","displayName"},
# with the id taken from "dataset schema".
databox metric create --name "Revenue" --dataset-id 67890 \
  --measure '{"id":"amount","displayName":"Amount"}' \
  --date '{"id":"date","displayName":"Date"}' \
  --dimension '{"id":"country","displayName":"Country"}'

# List the dataset's metrics, then read the rows behind one for January 2026
databox metric list --source-id 67890
databox metric drilldown --metric-id "67890|custom_query_100" --source-id 67890 \
  --start-timestamp 1767225600 --end-timestamp 1769904000 --dimension-id country
```

`metric create` prints the new metric, including its ID; use that ID in place of `67890|custom_query_100`.

## Authentication

All commands except `auth login` need an API key. `databox auth login` prompts for it and stores it in `~/.config/databox-cli/config.json`, readable only by you. You can also pass it inline:

```bash
databox auth login --api-key YOUR_API_KEY
```

In CI, set `DATABOX_API_KEY` instead; it takes precedence over the stored key.

## Global Flags

Every command accepts these:

| Flag | Env var | Description |
|------|---------|-------------|
| `--output table\|json\|csv` | — | Output format. Default `table`. |
| `--json` | — | Shorthand for `--output json`. Cannot be combined with `--output`. |
| `--verbose` | — | Print each request and response (method, URL, status, duration, request ID) to stderr. The API key is never printed. |
| `--no-color` | `NO_COLOR` | Disable coloured output. A non-empty `NO_COLOR` does the same. |
| `--api-key` | `DATABOX_API_KEY` | Use this API key instead of the stored one. |
| `--api-url` | `DATABOX_API_URL` | Override the API base URL (default `https://api.databox.com`). |
| `--account-id` | `DATABOX_ACCOUNT_ID` | Target an account in your organization (see [Organizations and accounts](#organizations-and-accounts)). |
| `-h`, `--help` | — | Show help for a command or topic. |

`--api-key`, `--api-url` and `--account-id` do not appear in each command's `--help`, but work on every command that calls the API.

Commands that return a list also take:

| Flag | Description |
|------|-------------|
| `--page` | Page number, starting at 0. |
| `--page-size` | Items per page: at most 100, or 1000 on `dataset data` and `metric drilldown`. |
| `--all` | Fetch every page and print them as one list. Cannot be combined with `--page`. |
| `--search`, `--sort-by`, `--sort-order` | On the commands that support them; `--help` lists the accepted sort fields. |

### Safe retries with `--idempotency-key`

Commands that create something, or start work that should not happen twice, accept `--idempotency-key <uuid>`. The key is sent as the `Idempotency-Key` header: a retry with the same key within 24 hours returns the first response instead of repeating the action.

```bash
KEY=$(uuidgen)
databox dataset ingest 67890 --file orders.json --idempotency-key "$KEY"
# Timed out? Re-running with the same key cannot ingest the rows twice.
databox dataset ingest 67890 --file orders.json --idempotency-key "$KEY"
```

It is available on `account create`, `data-source create`, `data-source purge`, `dataset create`, `dataset duplicate`, `dataset ingest`, `dataset purge`, `dataset update-modification`, `metric create` and `user invite`. The value must be a UUID.

## Output Formats

Commands print a table by default. `--output json` (or `--json`) and `--output csv` are for scripts:

```bash
# JSON, filtered with jq
databox dataset list --json | jq '.[] | {id, name}'

# Every data source as CSV, across all pages
databox data-source list --all --output csv > data-sources.csv

# A dataset's rows as CSV
databox dataset data 67890 --all --output csv > orders.csv
```

What `--json` prints:

- **Lists** print a JSON array of the items, each exactly as the API returned it. With `--all`, the array holds every page.
- **Responses that carry more than a list** print the whole response object: `dataset schema` (`{items, primaryKey}`), `dataset data` (`{items, pagination, schema, lastUpdatedAt}`), `dataset preview-modification` and `metric drilldown` (`{items, schema, pagination}`), `databoard metrics`.
- **Single resources** print the object the API returned. Commands that change a resource and get it back — `metric create`, `metric update`, `set-timezone`, `set-sync-frequency`, `set-verification` and the like — print the updated resource. In table mode they print a one-line confirmation instead.
- **Deletes, purges and clears** print a one-line confirmation in every format.

CSV uses the same columns as the table, with a header row even when there are no results. A single resource prints as `field,value` rows.

Stdout carries only the result. Pagination footers appear in table mode only, and `--verbose` traces, warnings and errors go to stderr, so piping stays clean.

## Errors and Exit Codes

When the API rejects a request, the CLI prints the error code, the message, the field at fault (if any) and the request ID, on stderr:

```
 ›   Error: invalid_input
 ›     Unknown timezone.
 ›     Field: timezone
 ›     Request ID: 0HN7A2B3C4D5E:00000001
```

If you contact Databox support about a failed command, quote the **Request ID**: it identifies the exact request in Databox's logs. `--verbose` prints the request ID of successful requests too.

| Exit code | Meaning |
|-----------|---------|
| `0` | Success. Declining a confirmation prompt also exits 0, after printing `Aborted.`, and so does a prompt whose input closes unanswered: a script that forgets `--force` deletes nothing. |
| `1` | The API returned an error (4xx or 5xx). Also: no API key is configured, the stored config file is not valid JSON, the response was not JSON (usually a wrong `--api-url`), or an update command was given no field to change. |
| `2` | The request was never sent, or never reached the API: an unknown flag, a value outside a flag's options, a malformed ID or JSON value, or a network failure or timeout. |
| `130` | A prompt (a confirmation, or the API key at `auth login`) was interrupted with Ctrl-C. |

## Organizations and accounts

Your **organization** is the top level: `databox organization info`, `organization update` and `organization usage` read and change it. An organization that manages several accounts (an agency) lists and manages them with the `account` commands, and `--account-id` scopes any command to one of them:

```bash
# List the accounts in your organization
databox account list

# List data sources in one account
databox data-source list --account-id 12345
```

With `--account-id`, the `organization` commands answer for that account. `databox profile info` always shows your own organization, and your home account if you belong to one.

## Agent Skills

This package includes skills that let AI agents (like [Claude Code](https://claude.ai/claude-code)) use the CLI on your behalf.

### Bundled Skills

| Skill | Description |
|-------|-------------|
| `databox-auth` | Authentication setup and API key validation |
| `databox-organization` | Organization info, usage, settings, timezones |
| `databox-data-sources` | Data source CRUD, timezone, sync frequency, permissions, purge |
| `databox-datasets` | Dataset CRUD, schema, data ingestion, metadata, verification, modifications, lineage |
| `databox-metrics` | Custom metric CRUD, dimension values, drilldown, lineage, usages, verification |
| `databox-users` | User invites, roles, removal |
| `databox-accounts` | Managing the accounts in your organization |
| `databox-connections` | Connection management and permissions |
| `databox-integrations` | Browse the integration catalog |
| `databox-billing` | Plan details and invoices |
| `databox-analyze` | Dataset analysis with Genie AI, conversational data Q&A |

### Install Skills

Install all skills at once using [npx skills](https://github.com/anthropics/skills):

```bash
npx skills add databox/databox-cli --skill '*'
```

Or install individual skills:

```bash
npx skills add databox/databox-cli --skill databox-auth
npx skills add databox/databox-cli --skill databox-organization
npx skills add databox/databox-cli --skill databox-data-sources
npx skills add databox/databox-cli --skill databox-datasets
npx skills add databox/databox-cli --skill databox-metrics
npx skills add databox/databox-cli --skill databox-users
npx skills add databox/databox-cli --skill databox-accounts
npx skills add databox/databox-cli --skill databox-connections
npx skills add databox/databox-cli --skill databox-integrations
npx skills add databox/databox-cli --skill databox-billing
npx skills add databox/databox-cli --skill databox-analyze
```

Once installed, Claude Code can manage your Databox resources directly — your organization and its accounts, data sources, datasets, metrics, users, connections and billing — and analyze data with Genie AI.

## Changelog

See the [changelog](https://github.com/databox/databox-cli/blob/main/CHANGELOG.md) for migration guides and version history.

## Commands

<!-- commands -->
* [`databox account create`](#databox-account-create)
* [`databox account delete ACCOUNTID`](#databox-account-delete-accountid)
* [`databox account get ACCOUNTID`](#databox-account-get-accountid)
* [`databox account list`](#databox-account-list)
* [`databox account update ACCOUNTID`](#databox-account-update-accountid)
* [`databox activity-log list`](#databox-activity-log-list)
* [`databox analyze ask-genie DATASETID QUESTION`](#databox-analyze-ask-genie-datasetid-question)
* [`databox auth login`](#databox-auth-login)
* [`databox auth validate`](#databox-auth-validate)
* [`databox billing info`](#databox-billing-info)
* [`databox billing invoices`](#databox-billing-invoices)
* [`databox connection delete CONNECTIONID`](#databox-connection-delete-connectionid)
* [`databox connection get CONNECTIONID`](#databox-connection-get-connectionid)
* [`databox connection list`](#databox-connection-list)
* [`databox connection permissions CONNECTIONID`](#databox-connection-permissions-connectionid)
* [`databox connection set-permissions CONNECTIONID`](#databox-connection-set-permissions-connectionid)
* [`databox connection update CONNECTIONID`](#databox-connection-update-connectionid)
* [`databox data-source create`](#databox-data-source-create)
* [`databox data-source datasets DATASOURCEID`](#databox-data-source-datasets-datasourceid)
* [`databox data-source delete DATASOURCEID`](#databox-data-source-delete-datasourceid)
* [`databox data-source get DATASOURCEID`](#databox-data-source-get-datasourceid)
* [`databox data-source list`](#databox-data-source-list)
* [`databox data-source permissions DATASOURCEID`](#databox-data-source-permissions-datasourceid)
* [`databox data-source purge DATASOURCEID`](#databox-data-source-purge-datasourceid)
* [`databox data-source set-permissions DATASOURCEID`](#databox-data-source-set-permissions-datasourceid)
* [`databox data-source set-sync-frequency DATASOURCEID`](#databox-data-source-set-sync-frequency-datasourceid)
* [`databox data-source set-timezone DATASOURCEID`](#databox-data-source-set-timezone-datasourceid)
* [`databox data-source sync-frequency-options DATASOURCEID`](#databox-data-source-sync-frequency-options-datasourceid)
* [`databox data-source update DATASOURCEID`](#databox-data-source-update-datasourceid)
* [`databox databoard list`](#databox-databoard-list)
* [`databox databoard metrics DATABOARDID`](#databox-databoard-metrics-databoardid)
* [`databox dataset clear-modifications DATASETID`](#databox-dataset-clear-modifications-datasetid)
* [`databox dataset column-metadata DATASETID`](#databox-dataset-column-metadata-datasetid)
* [`databox dataset create`](#databox-dataset-create)
* [`databox dataset data DATASETID`](#databox-dataset-data-datasetid)
* [`databox dataset delete DATASETID`](#databox-dataset-delete-datasetid)
* [`databox dataset duplicate DATASETID`](#databox-dataset-duplicate-datasetid)
* [`databox dataset get DATASETID`](#databox-dataset-get-datasetid)
* [`databox dataset ingest DATASETID`](#databox-dataset-ingest-datasetid)
* [`databox dataset ingestion DATASETID INGESTIONID`](#databox-dataset-ingestion-datasetid-ingestionid)
* [`databox dataset ingestion-statistics DATASETID`](#databox-dataset-ingestion-statistics-datasetid)
* [`databox dataset ingestions DATASETID`](#databox-dataset-ingestions-datasetid)
* [`databox dataset lineage DATASETID`](#databox-dataset-lineage-datasetid)
* [`databox dataset list`](#databox-dataset-list)
* [`databox dataset metadata DATASETID`](#databox-dataset-metadata-datasetid)
* [`databox dataset modification-functions`](#databox-dataset-modification-functions)
* [`databox dataset modification-rules`](#databox-dataset-modification-rules)
* [`databox dataset modifications DATASETID`](#databox-dataset-modifications-datasetid)
* [`databox dataset permissions DATASETID`](#databox-dataset-permissions-datasetid)
* [`databox dataset preview-modification DATASETID`](#databox-dataset-preview-modification-datasetid)
* [`databox dataset purge DATASETID`](#databox-dataset-purge-datasetid)
* [`databox dataset schema DATASETID`](#databox-dataset-schema-datasetid)
* [`databox dataset set-column-metadata DATASETID`](#databox-dataset-set-column-metadata-datasetid)
* [`databox dataset set-metadata DATASETID`](#databox-dataset-set-metadata-datasetid)
* [`databox dataset set-permissions DATASETID`](#databox-dataset-set-permissions-datasetid)
* [`databox dataset set-sync-frequency DATASETID`](#databox-dataset-set-sync-frequency-datasetid)
* [`databox dataset set-timezone DATASETID`](#databox-dataset-set-timezone-datasetid)
* [`databox dataset set-verification DATASETID`](#databox-dataset-set-verification-datasetid)
* [`databox dataset sync-frequency-options DATASETID`](#databox-dataset-sync-frequency-options-datasetid)
* [`databox dataset sync-history DATASETID`](#databox-dataset-sync-history-datasetid)
* [`databox dataset sync-statistics DATASETID`](#databox-dataset-sync-statistics-datasetid)
* [`databox dataset update DATASETID`](#databox-dataset-update-datasetid)
* [`databox dataset update-modification DATASETID`](#databox-dataset-update-modification-datasetid)
* [`databox dataset verification DATASETID`](#databox-dataset-verification-datasetid)
* [`databox help [COMMAND]`](#databox-help-command)
* [`databox integration get INTEGRATIONID`](#databox-integration-get-integrationid)
* [`databox integration list`](#databox-integration-list)
* [`databox metric create`](#databox-metric-create)
* [`databox metric delete METRICID`](#databox-metric-delete-metricid)
* [`databox metric dimension-values`](#databox-metric-dimension-values)
* [`databox metric drilldown`](#databox-metric-drilldown)
* [`databox metric get METRICID`](#databox-metric-get-metricid)
* [`databox metric lineage METRICID`](#databox-metric-lineage-metricid)
* [`databox metric list`](#databox-metric-list)
* [`databox metric set-verification METRICID`](#databox-metric-set-verification-metricid)
* [`databox metric update METRICID`](#databox-metric-update-metricid)
* [`databox metric usages METRICID`](#databox-metric-usages-metricid)
* [`databox metric verification METRICID`](#databox-metric-verification-metricid)
* [`databox organization countries`](#databox-organization-countries)
* [`databox organization info`](#databox-organization-info)
* [`databox organization metadata-options`](#databox-organization-metadata-options)
* [`databox organization timezones`](#databox-organization-timezones)
* [`databox organization update`](#databox-organization-update)
* [`databox organization usage`](#databox-organization-usage)
* [`databox profile info`](#databox-profile-info)
* [`databox profile metadata-options`](#databox-profile-metadata-options)
* [`databox profile update`](#databox-profile-update)
* [`databox user delete USERID`](#databox-user-delete-userid)
* [`databox user get USERID`](#databox-user-get-userid)
* [`databox user invite`](#databox-user-invite)
* [`databox user list`](#databox-user-list)
* [`databox user update USERID`](#databox-user-update-userid)

## `databox account create`

Create an account in your organization

```
USAGE
  $ databox account create --name <value> [--no-color] [--output table|json|csv | --json] [--verbose]
    [--idempotency-key <value>] [--managed-by-id <value>] [--website-url <value>]

FLAGS
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --managed-by-id=<value>    User ID of the account manager
  --name=<value>             (required) Name of the account
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr
  --website-url=<value>      Website URL for the account

DESCRIPTION
  Create an account in your organization

EXAMPLES
  $ databox account create --name "Acme Inc"

  $ databox account create --name "Acme Inc" --managed-by-id 12345

  $ databox account create --name "Acme Inc" --json
```

_See code: [src/commands/account/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/create.ts)_

## `databox account delete ACCOUNTID`

Delete an account from your organization

```
USAGE
  $ databox account delete ACCOUNTID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  ACCOUNTID  The account ID to delete

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Delete an account from your organization

EXAMPLES
  $ databox account delete 12345

  $ databox account delete 12345 --force
```

_See code: [src/commands/account/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/delete.ts)_

## `databox account get ACCOUNTID`

Get account details

```
USAGE
  $ databox account get ACCOUNTID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  ACCOUNTID  The account ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get account details

EXAMPLES
  $ databox account get 12345

  $ databox account get 12345 --json
```

_See code: [src/commands/account/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/get.ts)_

## `databox account list`

List accounts in your organization

```
USAGE
  $ databox account list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--search <value>] [--sort-by <value>] [--sort-order asc|desc]

FLAGS
  --all                  Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --page=<value>         Page number (0-indexed)
  --page-size=<value>    Number of items per page (max 100)
  --search=<value>       Search by name
  --sort-by=<value>      Field to sort by
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List accounts in your organization

  --sort-by takes name, website or managedBy. The CLI does not restrict it: the value is passed to the API as given.

EXAMPLES
  $ databox account list

  $ databox account list --sort-by name --sort-order asc

  $ databox account list --json
```

_See code: [src/commands/account/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/list.ts)_

## `databox account update ACCOUNTID`

Update an account

```
USAGE
  $ databox account update ACCOUNTID [--no-color] [--output table|json|csv | --json] [--verbose] [--managed-by-id
    <value>] [--name <value>] [--website-url <value>]

ARGUMENTS
  ACCOUNTID  The account ID to update

FLAGS
  --json                   Output as JSON (shorthand for --output json)
  --managed-by-id=<value>  User ID of the account manager
  --name=<value>           New name for the account
  --no-color               Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>        [default: table] Output format
                           <options: table|json|csv>
  --verbose                Print each request and response (method, URL, status, duration, request ID) to stderr
  --website-url=<value>    New website URL

DESCRIPTION
  Update an account

EXAMPLES
  $ databox account update 12345 --name "New Name"

  $ databox account update 12345 --managed-by-id 67890

  $ databox account update 12345 --name "New Name" --json
```

_See code: [src/commands/account/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/update.ts)_

## `databox activity-log list`

List activity log entries

```
USAGE
  $ databox activity-log list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--date-from <value>] [--date-to <value>] [--resource-type
    dataSource|dataset|metric|user|administration|billing|connection] [--search <value>] [--user-id <value>]

FLAGS
  --all                     Fetch every page (100 items per request unless --page-size is given) and print them as one
                            list
  --date-from=<value>       Only entries on or after this date (ISO 8601)
  --date-to=<value>         Only entries on or before this date (ISO 8601)
  --json                    Output as JSON (shorthand for --output json)
  --no-color                Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>         [default: table] Output format
                            <options: table|json|csv>
  --page=<value>            Page number (0-indexed)
  --page-size=<value>       Number of items per page (max 100)
  --resource-type=<option>  Filter by resource type
                            <options: dataSource|dataset|metric|user|administration|billing|connection>
  --search=<value>          Search the log text
  --user-id=<value>         Filter by the ID of the user who acted
  --verbose                 Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List activity log entries

EXAMPLES
  $ databox activity-log list

  $ databox activity-log list --resource-type dataSource

  $ databox activity-log list --user-id 123

  $ databox activity-log list --json
```

_See code: [src/commands/activity-log/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/activity-log/list.ts)_

## `databox analyze ask-genie DATASETID QUESTION`

Ask Genie AI a question about a dataset

```
USAGE
  $ databox analyze ask-genie DATASETID QUESTION [--no-color] [--output table|json|csv | --json] [--verbose]
    [--service-url <value>] [--thread-id <value>]

ARGUMENTS
  DATASETID  The dataset ID to query
  QUESTION   The question to ask Genie

FLAGS
  --json                 Output as JSON
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --service-url=<value>  [default: https://agentic-service.databox.com, env: DATABOX_AGENTIC_SERVICE_URL] Override the
                         agentic service base URL
  --thread-id=<value>    Continue an existing conversation thread
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Ask Genie AI a question about a dataset

EXAMPLES
  $ databox analyze ask-genie abc-123 "What are the top metrics?"

  $ databox analyze ask-genie abc-123 "Show trends" --thread-id tid-456

  $ databox analyze ask-genie abc-123 "Summarize data" --json
```

_See code: [src/commands/analyze/ask-genie.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/analyze/ask-genie.ts)_

## `databox auth login`

Authenticate with Databox by providing your API key

```
USAGE
  $ databox auth login [--api-key <value>]

FLAGS
  --api-key=<value>  API key (if not provided, you will be prompted)

DESCRIPTION
  Authenticate with Databox by providing your API key

EXAMPLES
  $ databox auth login

  $ databox auth login --api-key YOUR_KEY
```

_See code: [src/commands/auth/login.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/auth/login.ts)_

## `databox auth validate`

Validate the currently stored API key

```
USAGE
  $ databox auth validate [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Validate the currently stored API key

EXAMPLES
  $ databox auth validate

  $ databox auth validate --json
```

_See code: [src/commands/auth/validate.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/auth/validate.ts)_

## `databox billing info`

Show billing and plan details

```
USAGE
  $ databox billing info [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show billing and plan details

EXAMPLES
  $ databox billing info

  $ databox billing info --json
```

_See code: [src/commands/billing/info.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/billing/info.ts)_

## `databox billing invoices`

List invoices

```
USAGE
  $ databox billing invoices [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>]

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List invoices

EXAMPLES
  $ databox billing invoices

  $ databox billing invoices --json
```

_See code: [src/commands/billing/invoices.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/billing/invoices.ts)_

## `databox connection delete CONNECTIONID`

Delete a connection

```
USAGE
  $ databox connection delete CONNECTIONID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  CONNECTIONID  The connection ID to delete

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Delete a connection

EXAMPLES
  $ databox connection delete 12345

  $ databox connection delete 12345 --force
```

_See code: [src/commands/connection/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/delete.ts)_

## `databox connection get CONNECTIONID`

Get connection details

```
USAGE
  $ databox connection get CONNECTIONID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get connection details

EXAMPLES
  $ databox connection get 12345

  $ databox connection get 12345 --json
```

_See code: [src/commands/connection/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/get.ts)_

## `databox connection list`

List connections

```
USAGE
  $ databox connection list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--search <value>]

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --search=<value>     Search by connection name
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List connections

EXAMPLES
  $ databox connection list

  $ databox connection list --search google

  $ databox connection list --json
```

_See code: [src/commands/connection/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/list.ts)_

## `databox connection permissions CONNECTIONID`

Show connection permissions

```
USAGE
  $ databox connection permissions CONNECTIONID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show connection permissions

EXAMPLES
  $ databox connection permissions 12345

  $ databox connection permissions 12345 --json
```

_See code: [src/commands/connection/permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/permissions.ts)_

## `databox connection set-permissions CONNECTIONID`

Update connection permissions

```
USAGE
  $ databox connection set-permissions CONNECTIONID --access-level everyone|selectedUsers|private --shared-with-accounts
    [--no-color] [--output table|json|csv | --json] [--verbose] [--access-list <value>...]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --access-level=<option>      (required) Access level for the connection
                               <options: everyone|selectedUsers|private>
  --access-list=<value>...     User ID granted access, with --access-level selectedUsers (repeat for several)
  --json                       Output as JSON (shorthand for --output json)
  --no-color                   Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>            [default: table] Output format
                               <options: table|json|csv>
  --[no-]shared-with-accounts  (required) Share this connection with the accounts in your organization
                               (--no-shared-with-accounts to stop sharing)
  --verbose                    Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update connection permissions

  --shared-with-accounts or --no-shared-with-accounts is required: the API replaces the sharing setting on every call,
  so leaving it out would silently un-share the connection.

EXAMPLES
  $ databox connection set-permissions 12345 --access-level everyone --shared-with-accounts

  $ databox connection set-permissions 12345 --access-level private --no-shared-with-accounts --json

  $ databox connection set-permissions 12345 --access-level selectedUsers --access-list 31 --no-shared-with-accounts
```

_See code: [src/commands/connection/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/set-permissions.ts)_

## `databox connection update CONNECTIONID`

Update a connection

```
USAGE
  $ databox connection update CONNECTIONID [--no-color] [--output table|json|csv | --json] [--verbose] [--name <value>]

ARGUMENTS
  CONNECTIONID  The connection ID to update

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --name=<value>     New name for the connection
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update a connection

EXAMPLES
  $ databox connection update 12345 --name "New Name"

  $ databox connection update 12345 --name "New Name" --json
```

_See code: [src/commands/connection/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/update.ts)_

## `databox data-source create`

Create a new data source

```
USAGE
  $ databox data-source create --name <value> [--no-color] [--output table|json|csv | --json] [--verbose]
    [--idempotency-key <value>] [--integration-key <value>] [--timezone <value>]

FLAGS
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --integration-key=<value>  Integration key for the data source (e.g., Datadoo)
  --json                     Output as JSON (shorthand for --output json)
  --name=<value>             (required) Name of the data source
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --timezone=<value>         Timezone for the data source
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Create a new data source

EXAMPLES
  $ databox data-source create --name "My Data Source"

  $ databox data-source create --name "My Data Source" --timezone "US/Eastern"

  $ databox data-source create --name "My Data Source" --integration-key Datadoo

  $ databox data-source create --name "My Data Source" --json
```

_See code: [src/commands/data-source/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/create.ts)_

## `databox data-source datasets DATASOURCEID`

List datasets for a data source

```
USAGE
  $ databox data-source datasets DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page
    <value>] [--page-size <value>] [--search <value>] [--sort-by name|createdAt|lastActivityAt] [--sort-order asc|desc]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --all                  Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --page=<value>         Page number (0-indexed)
  --page-size=<value>    Number of items per page (max 100)
  --search=<value>       Search by name
  --sort-by=<option>     Field to sort by
                         <options: name|createdAt|lastActivityAt>
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List datasets for a data source

EXAMPLES
  $ databox data-source datasets 12345

  $ databox data-source datasets 12345 --search "orders" --sort-by name

  $ databox data-source datasets 12345 --page 0 --page-size 10

  $ databox data-source datasets 12345 --json
```

_See code: [src/commands/data-source/datasets.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/datasets.ts)_

## `databox data-source delete DATASOURCEID`

Delete a data source

```
USAGE
  $ databox data-source delete DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  DATASOURCEID  ID of the data source to delete

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Delete a data source

EXAMPLES
  $ databox data-source delete 12345

  $ databox data-source delete 12345 --force
```

_See code: [src/commands/data-source/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/delete.ts)_

## `databox data-source get DATASOURCEID`

Get details of a data source

```
USAGE
  $ databox data-source get DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get details of a data source

EXAMPLES
  $ databox data-source get 12345

  $ databox data-source get 12345 --json
```

_See code: [src/commands/data-source/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/get.ts)_

## `databox data-source list`

List all data sources

```
USAGE
  $ databox data-source list [--no-color] [--output table|json|csv | --json] [--verbose] [--connection-id <value>]
    [--all | --page <value>] [--page-size <value>] [--search <value>] [--sort-by name|createdAt|lastActivityAt]
    [--sort-order asc|desc]

FLAGS
  --all                    Fetch every page (100 items per request unless --page-size is given) and print them as one
                           list
  --connection-id=<value>  Filter by connection ID
  --json                   Output as JSON (shorthand for --output json)
  --no-color               Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>        [default: table] Output format
                           <options: table|json|csv>
  --page=<value>           Page number (0-indexed)
  --page-size=<value>      Number of items per page (max 100)
  --search=<value>         Search by name
  --sort-by=<option>       Field to sort by
                           <options: name|createdAt|lastActivityAt>
  --sort-order=<option>    Sort direction
                           <options: asc|desc>
  --verbose                Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List all data sources

EXAMPLES
  $ databox data-source list

  $ databox data-source list --search "Google"

  $ databox data-source list --sort-by lastActivityAt --sort-order desc

  $ databox data-source list --page 0 --page-size 10 --json
```

_See code: [src/commands/data-source/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/list.ts)_

## `databox data-source permissions DATASOURCEID`

Show permissions for a data source

```
USAGE
  $ databox data-source permissions DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show permissions for a data source

EXAMPLES
  $ databox data-source permissions 12345

  $ databox data-source permissions 12345 --json
```

_See code: [src/commands/data-source/permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/permissions.ts)_

## `databox data-source purge DATASOURCEID`

Purge all data from a data source

```
USAGE
  $ databox data-source purge DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]
    [--idempotency-key <value>]

ARGUMENTS
  DATASOURCEID  ID of the data source to purge

FLAGS
  --force                    Skip confirmation prompt
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Purge all data from a data source

EXAMPLES
  $ databox data-source purge 12345

  $ databox data-source purge 12345 --force
```

_See code: [src/commands/data-source/purge.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/purge.ts)_

## `databox data-source set-permissions DATASOURCEID`

Set permissions for a data source

```
USAGE
  $ databox data-source set-permissions DATASOURCEID --access-level everyone|selectedUsers|private [--no-color] [--output
    table|json|csv | --json] [--verbose] [--access-list <value>...]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --access-level=<option>   (required) Access level
                            <options: everyone|selectedUsers|private>
  --access-list=<value>...  User ID granted access, with --access-level selectedUsers (repeat for several)
  --json                    Output as JSON (shorthand for --output json)
  --no-color                Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>         [default: table] Output format
                            <options: table|json|csv>
  --verbose                 Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set permissions for a data source

  everyone grants every user in the organization; selectedUsers grants only the users in --access-list; private grants
  no one explicitly. Admins and the organization owner always keep access.

EXAMPLES
  $ databox data-source set-permissions 12345 --access-level everyone

  $ databox data-source set-permissions 12345 --access-level selectedUsers --access-list 31 --access-list 42

  $ databox data-source set-permissions 12345 --access-level private
```

_See code: [src/commands/data-source/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-permissions.ts)_

## `databox data-source set-sync-frequency DATASOURCEID`

Set the sync frequency for a data source

```
USAGE
  $ databox data-source set-sync-frequency DATASOURCEID --interval 1|15|60|240|360|480|1440 [--no-color] [--output table|json|csv |
    --json] [--verbose]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --interval=<option>  (required) Sync interval in minutes
                       <options: 1|15|60|240|360|480|1440>
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set the sync frequency for a data source

  Prints a confirmation; --json or --output csv prints the updated data source instead. Run "data-source
  sync-frequency-options" to see which intervals your plan includes.

EXAMPLES
  $ databox data-source set-sync-frequency 12345 --interval 60

  $ databox data-source set-sync-frequency 12345 --interval 1440 --json
```

_See code: [src/commands/data-source/set-sync-frequency.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-sync-frequency.ts)_

## `databox data-source set-timezone DATASOURCEID`

Set the timezone for a data source

```
USAGE
  $ databox data-source set-timezone DATASOURCEID --timezone <value> [--no-color] [--output table|json|csv | --json]
    [--verbose] [--apply-to-datasets] [--purge-data]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --apply-to-datasets  Apply the timezone to the datasets too
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --purge-data         Purge existing data when changing the timezone
  --timezone=<value>   (required) Timezone value
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set the timezone for a data source

  Prints a confirmation; --json or --output csv prints the updated data source instead.

EXAMPLES
  $ databox data-source set-timezone 12345 --timezone "US/Eastern"

  $ databox data-source set-timezone 12345 --timezone "Europe/London" --apply-to-datasets --json
```

_See code: [src/commands/data-source/set-timezone.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-timezone.ts)_

## `databox data-source sync-frequency-options DATASOURCEID`

List the sync frequencies a data source can be set to, and which your plan includes

```
USAGE
  $ databox data-source sync-frequency-options DATASOURCEID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List the sync frequencies a data source can be set to, and which your plan includes

EXAMPLES
  $ databox data-source sync-frequency-options 12345

  $ databox data-source sync-frequency-options 12345 --json
```

_See code: [src/commands/data-source/sync-frequency-options.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/sync-frequency-options.ts)_

## `databox data-source update DATASOURCEID`

Update a data source

```
USAGE
  $ databox data-source update DATASOURCEID --name <value> [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASOURCEID  ID of the data source to update

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --name=<value>     (required) New name for the data source
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update a data source

EXAMPLES
  $ databox data-source update 12345 --name "New Name"

  $ databox data-source update 12345 --name "New Name" --json
```

_See code: [src/commands/data-source/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/update.ts)_

## `databox databoard list`

List databoards

```
USAGE
  $ databox databoard list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--search <value>]

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --search=<value>     Search by databoard name
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List databoards

EXAMPLES
  $ databox databoard list

  $ databox databoard list --search marketing

  $ databox databoard list --json
```

_See code: [src/commands/databoard/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/databoard/list.ts)_

## `databox databoard metrics DATABOARDID`

Get the metrics on a databoard

```
USAGE
  $ databox databoard metrics DATABOARDID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATABOARDID  The databoard ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get the metrics on a databoard

  One row per metric on each datablock; a datablock without metrics gets one row of its own. --json returns the whole
  response, including each metric's applied filters, which "metric drilldown --filters" accepts as they are.

EXAMPLES
  $ databox databoard metrics 12345

  $ databox databoard metrics 12345 --json
```

_See code: [src/commands/databoard/metrics.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/databoard/metrics.ts)_

## `databox dataset clear-modifications DATASETID`

Clear all modifications from a dataset

```
USAGE
  $ databox dataset clear-modifications DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Clear all modifications from a dataset

EXAMPLES
  $ databox dataset clear-modifications 12345

  $ databox dataset clear-modifications 12345 --force
```

_See code: [src/commands/dataset/clear-modifications.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/clear-modifications.ts)_

## `databox dataset column-metadata DATASETID`

Get column metadata for a dataset

```
USAGE
  $ databox dataset column-metadata DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get column metadata for a dataset

EXAMPLES
  $ databox dataset column-metadata 12345

  $ databox dataset column-metadata 12345 --json
```

_See code: [src/commands/dataset/column-metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/column-metadata.ts)_

## `databox dataset create`

Create a new dataset

```
USAGE
  $ databox dataset create --data-source-id <value> --name <value> [--no-color] [--output table|json|csv | --json]
    [--verbose] [--idempotency-key <value>] [--primary-key <value>...] [--schema <value>]

FLAGS
  --data-source-id=<value>   (required) ID of the data source to associate with
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --name=<value>             (required) Name of the dataset
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --primary-key=<value>...   Primary key column names
  --schema=<value>           JSON array of schema columns, each {id, dataType} with dataType one of string, number,
                             datetime
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Create a new dataset

EXAMPLES
  $ databox dataset create --name "My Dataset" --data-source-id 123

  $ databox dataset create --name "My Dataset" --data-source-id 123 --primary-key date --primary-key campaign

  $ databox dataset create --name "My Dataset" --data-source-id 123 --schema '[{"id":"date","dataType":"datetime"},{"id":"value","dataType":"number"}]'

  $ databox dataset create --name "My Dataset" --data-source-id 123 --json
```

_See code: [src/commands/dataset/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/create.ts)_

## `databox dataset data DATASETID`

Get data from a dataset

```
USAGE
  $ databox dataset data DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page
    <value>] [--page-size <value>] [--sort-by <value>] [--sort-order asc|desc]

ARGUMENTS
  DATASETID  The dataset ID to get data from

FLAGS
  --all                  Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --page=<value>         Page number (0-indexed)
  --page-size=<value>    Number of items per page (max 1000)
  --sort-by=<value>      Field to sort by
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get data from a dataset

  Columns follow the dataset schema: in its order, headed by display name, without the columns a modification hid.
  --json returns the whole response: the rows under "items", with "schema" and "lastUpdatedAt".

EXAMPLES
  $ databox dataset data 12345

  $ databox dataset data 12345 --page 0 --page-size 10

  $ databox dataset data 12345 --sort-by amount --sort-order desc

  $ databox dataset data 12345 --output csv > rows.csv

  $ databox dataset data 12345 --json
```

_See code: [src/commands/dataset/data.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/data.ts)_

## `databox dataset delete DATASETID`

Delete a dataset

```
USAGE
  $ databox dataset delete DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  DATASETID  The dataset ID to delete

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Delete a dataset

EXAMPLES
  $ databox dataset delete 12345

  $ databox dataset delete 12345 --force
```

_See code: [src/commands/dataset/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/delete.ts)_

## `databox dataset duplicate DATASETID`

Duplicate a dataset (not supported for datasets created through the API)

```
USAGE
  $ databox dataset duplicate DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--idempotency-key
    <value>] [--name <value>]

ARGUMENTS
  DATASETID  The dataset ID to duplicate

FLAGS
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --name=<value>             Name for the duplicate (defaults to a server-generated name)
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Duplicate a dataset (not supported for datasets created through the API)

EXAMPLES
  $ databox dataset duplicate 12345

  $ databox dataset duplicate 12345 --json
```

_See code: [src/commands/dataset/duplicate.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/duplicate.ts)_

## `databox dataset get DATASETID`

Get details of a specific dataset

```
USAGE
  $ databox dataset get DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID to retrieve

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get details of a specific dataset

EXAMPLES
  $ databox dataset get 12345

  $ databox dataset get 12345 --json
```

_See code: [src/commands/dataset/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/get.ts)_

## `databox dataset ingest DATASETID`

Ingest data into a dataset

```
USAGE
  $ databox dataset ingest DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--file <value> |
    --records <value>] [--idempotency-key <value>]

ARGUMENTS
  DATASETID  The dataset ID to ingest data into

FLAGS
  --file=<value>             Path to a JSON file containing a records array (at least one record)
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --records=<value>          Inline JSON array of records (at least one record)
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Ingest data into a dataset

EXAMPLES
  $ databox dataset ingest 12345 --records '[{"date":"2024-01-01","value":42}]'

  $ databox dataset ingest 12345 --file ./data.json

  cat data.json | databox dataset ingest 12345

  $ databox dataset ingest 12345 --records '[{"date":"2024-01-01","value":42}]' --json
```

_See code: [src/commands/dataset/ingest.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingest.ts)_

## `databox dataset ingestion DATASETID INGESTIONID`

Get details of a specific ingestion

```
USAGE
  $ databox dataset ingestion DATASETID INGESTIONID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID    The dataset ID
  INGESTIONID  The ingestion ID to retrieve

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get details of a specific ingestion

EXAMPLES
  $ databox dataset ingestion 12345 3c63e510-276f-4541-9c66-8c00161fda82

  $ databox dataset ingestion 12345 3c63e510-276f-4541-9c66-8c00161fda82 --json
```

_See code: [src/commands/dataset/ingestion.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingestion.ts)_

## `databox dataset ingestion-statistics DATASETID`

Get ingestion statistics for a dataset

```
USAGE
  $ databox dataset ingestion-statistics DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get ingestion statistics for a dataset

EXAMPLES
  $ databox dataset ingestion-statistics 12345

  $ databox dataset ingestion-statistics 12345 --json
```

_See code: [src/commands/dataset/ingestion-statistics.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingestion-statistics.ts)_

## `databox dataset ingestions DATASETID`

List ingestions for a dataset

```
USAGE
  $ databox dataset ingestions DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page
    <value>] [--page-size <value>]

ARGUMENTS
  DATASETID  The dataset ID to list ingestions for

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List ingestions for a dataset

EXAMPLES
  $ databox dataset ingestions 12345

  $ databox dataset ingestions 12345 --page 0 --page-size 20

  $ databox dataset ingestions 12345 --json
```

_See code: [src/commands/dataset/ingestions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingestions.ts)_

## `databox dataset lineage DATASETID`

Show dataset lineage (parents and children)

```
USAGE
  $ databox dataset lineage DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show dataset lineage (parents and children)

  Parents are the data sources and datasets this dataset is built from; children are the datasets and metrics built from
  it. Type is dataSource, dataset, mergedDataset, basicMetric or customMetric. A metric's ID is its key, so IDs are
  strings.

EXAMPLES
  $ databox dataset lineage 12345

  $ databox dataset lineage 12345 --json
```

_See code: [src/commands/dataset/lineage.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/lineage.ts)_

## `databox dataset list`

List datasets

```
USAGE
  $ databox dataset list [--no-color] [--output table|json|csv | --json] [--verbose] [--data-source-id <value>]
    [--all | --page <value>] [--page-size <value>] [--search <value>] [--sort-by name|createdAt|lastActivityAt]
    [--sort-order asc|desc]

FLAGS
  --all                     Fetch every page (100 items per request unless --page-size is given) and print them as one
                            list
  --data-source-id=<value>  Filter by data source ID
  --json                    Output as JSON (shorthand for --output json)
  --no-color                Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>         [default: table] Output format
                            <options: table|json|csv>
  --page=<value>            Page number (0-indexed)
  --page-size=<value>       Number of items per page (max 100)
  --search=<value>          Search by name
  --sort-by=<option>        Field to sort by
                            <options: name|createdAt|lastActivityAt>
  --sort-order=<option>     Sort direction
                            <options: asc|desc>
  --verbose                 Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List datasets

EXAMPLES
  $ databox dataset list

  $ databox dataset list --search "revenue"

  $ databox dataset list --sort-by lastActivityAt --sort-order desc

  $ databox dataset list --page 0 --page-size 10

  $ databox dataset list --json
```

_See code: [src/commands/dataset/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/list.ts)_

## `databox dataset metadata DATASETID`

Get metadata for a dataset

```
USAGE
  $ databox dataset metadata DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get metadata for a dataset

EXAMPLES
  $ databox dataset metadata 12345

  $ databox dataset metadata 12345 --json
```

_See code: [src/commands/dataset/metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/metadata.ts)_

## `databox dataset modification-functions`

List the functions available to modification formulas

```
USAGE
  $ databox dataset modification-functions [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List the functions available to modification formulas

  --json also includes each function's parameters and an example.

EXAMPLES
  $ databox dataset modification-functions

  $ databox dataset modification-functions --json
```

_See code: [src/commands/dataset/modification-functions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/modification-functions.ts)_

## `databox dataset modification-rules`

List the filter operators and type conversions modifications accept

```
USAGE
  $ databox dataset modification-rules [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List the filter operators and type conversions modifications accept

  Filter operators are what "filters" conditions take as "type", per column type. Type conversions are what "dataTypes"
  accepts as "outputLogicalType" (and "inputFormat"), per current column type, followed by the output formats and
  scales.

EXAMPLES
  $ databox dataset modification-rules

  $ databox dataset modification-rules --json
```

_See code: [src/commands/dataset/modification-rules.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/modification-rules.ts)_

## `databox dataset modifications DATASETID`

Show a dataset's modification definition

```
USAGE
  $ databox dataset modifications DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show a dataset's modification definition

  The table has one row per column, in the dataset's column order. --json returns the definition as the API does:
  {filters, formulas, displayNames, dataTypes, order, visibility}, the input "dataset update-modification" takes.

EXAMPLES
  $ databox dataset modifications 12345

  $ databox dataset modifications 12345 --json
```

_See code: [src/commands/dataset/modifications.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/modifications.ts)_

## `databox dataset permissions DATASETID`

Get permissions for a dataset

```
USAGE
  $ databox dataset permissions DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get permissions for a dataset

EXAMPLES
  $ databox dataset permissions 12345

  $ databox dataset permissions 12345 --json
```

_See code: [src/commands/dataset/permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/permissions.ts)_

## `databox dataset preview-modification DATASETID`

Preview a dataset modification without saving it

```
USAGE
  $ databox dataset preview-modification DATASETID --data <value> [--no-color] [--output table|json|csv | --json] [--verbose]
    [--sort-by <value>] [--sort-order asc|desc]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --data=<value>         (required) JSON modification definition to preview: filters, formulas, displayNames, dataTypes,
                         order, visibility
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --sort-by=<value>      Field to sort by
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Preview a dataset modification without saving it

  --data takes the same definition as "dataset update-modification". The preview is a sample, not a paged read: it shows
  up to 200 rows and how many matched in all. Use "dataset data" to page through a dataset. --json returns the whole
  response: {items, pagination: {totalItems}, schema}.

EXAMPLES
  $ databox dataset preview-modification 12345 --data '{"filters":{"amount":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}'

  $ databox dataset preview-modification 12345 --data '{"formulas":{"totalWithTax":"$amount * 1.2"}}' --sort-by totalWithTax --sort-order desc

  $ databox dataset preview-modification 12345 --data '{"displayNames":{"amount":"Revenue"}}' --json
```

_See code: [src/commands/dataset/preview-modification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/preview-modification.ts)_

## `databox dataset purge DATASETID`

Purge all data from a dataset

```
USAGE
  $ databox dataset purge DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]
    [--idempotency-key <value>]

ARGUMENTS
  DATASETID  The dataset ID to purge data from

FLAGS
  --force                    Skip confirmation prompt
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Purge all data from a dataset

EXAMPLES
  $ databox dataset purge 12345

  $ databox dataset purge 12345 --force
```

_See code: [src/commands/dataset/purge.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/purge.ts)_

## `databox dataset schema DATASETID`

Get the schema of a dataset

```
USAGE
  $ databox dataset schema DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get the schema of a dataset

  The table is followed by the primary key: "n/a" for a dataset that cannot have one, "none" for an ingestion dataset
  created without one. --json returns the whole response, {items, primaryKey}.

EXAMPLES
  $ databox dataset schema 12345

  $ databox dataset schema 12345 --json
```

_See code: [src/commands/dataset/schema.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/schema.ts)_

## `databox dataset set-column-metadata DATASETID`

Update column metadata for a dataset

```
USAGE
  $ databox dataset set-column-metadata DATASETID --columns <value> [--no-color] [--output table|json|csv | --json]
  [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --columns=<value>  (required) JSON array of at least one column metadata update ({id, description?, conceptType?,
                     synonyms?})
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update column metadata for a dataset

  --columns takes at least one column. Each column is {id, description?, conceptType?, synonyms?}. conceptType is
  measure, dimension or timeDimension; synonyms is an array of alternative names. Display names are not set here: rename
  a column through "dataset update-modification" (displayNames). Prints the dataset's column metadata after the update.

EXAMPLES
  $ databox dataset set-column-metadata 12345 --columns '[{"id":"revenue","description":"Order value in USD","conceptType":"measure"}]'

  $ databox dataset set-column-metadata 12345 --columns '[{"id":"country","conceptType":"dimension","synonyms":["nation","market"]}]' --json
```

_See code: [src/commands/dataset/set-column-metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-column-metadata.ts)_

## `databox dataset set-metadata DATASETID`

Update metadata for a dataset

```
USAGE
  $ databox dataset set-metadata DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]
    [--default-time-dimension <value>] [--description <value>] [--synonyms <value>]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --default-time-dimension=<value>  ID of a datetime column to use as the default time dimension
  --description=<value>             Dataset description
  --json                            Output as JSON (shorthand for --output json)
  --no-color                        Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>                 [default: table] Output format
                                    <options: table|json|csv>
  --synonyms=<value>                JSON array of synonyms
  --verbose                         Print each request and response (method, URL, status, duration, request ID) to
                                    stderr

DESCRIPTION
  Update metadata for a dataset

EXAMPLES
  $ databox dataset set-metadata 12345 --description "Revenue tracking"

  $ databox dataset set-metadata 12345 --synonyms '["finance","quarterly"]'

  $ databox dataset set-metadata 12345 --default-time-dimension order_date
```

_See code: [src/commands/dataset/set-metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-metadata.ts)_

## `databox dataset set-permissions DATASETID`

Set permissions for a dataset

```
USAGE
  $ databox dataset set-permissions DATASETID --access-level everyone|selectedUsers|private [--no-color] [--output
    table|json|csv | --json] [--verbose] [--access-list <value>...]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --access-level=<option>   (required) Access level
                            <options: everyone|selectedUsers|private>
  --access-list=<value>...  User ID granted access, with --access-level selectedUsers (repeat for several)
  --json                    Output as JSON (shorthand for --output json)
  --no-color                Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>         [default: table] Output format
                            <options: table|json|csv>
  --verbose                 Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set permissions for a dataset

  everyone grants every user in the organization; selectedUsers grants only the users in --access-list; private grants
  no one explicitly. Admins and the organization owner always keep access.

EXAMPLES
  $ databox dataset set-permissions 12345 --access-level everyone

  $ databox dataset set-permissions 12345 --access-level selectedUsers --access-list 31 --access-list 42

  $ databox dataset set-permissions 12345 --access-level private
```

_See code: [src/commands/dataset/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-permissions.ts)_

## `databox dataset set-sync-frequency DATASETID`

Set the sync frequency for a dataset

```
USAGE
  $ databox dataset set-sync-frequency DATASETID --interval 1|15|60|240|360|480|1440 [--no-color] [--output table|json|csv |
    --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --interval=<option>  (required) Sync interval in minutes
                       <options: 1|15|60|240|360|480|1440>
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set the sync frequency for a dataset

  Prints a confirmation; --json or --output csv prints the updated dataset instead. Run "dataset sync-frequency-options"
  to see which intervals your plan includes.

EXAMPLES
  $ databox dataset set-sync-frequency 12345 --interval 60

  $ databox dataset set-sync-frequency 12345 --interval 1440 --json
```

_See code: [src/commands/dataset/set-sync-frequency.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-sync-frequency.ts)_

## `databox dataset set-timezone DATASETID`

Set the timezone for a dataset

```
USAGE
  $ databox dataset set-timezone DATASETID --timezone <value> [--no-color] [--output table|json|csv | --json] [--verbose]
    [--purge-data]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json              Output as JSON (shorthand for --output json)
  --no-color          Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>   [default: table] Output format
                      <options: table|json|csv>
  --purge-data        Purge existing data when changing the timezone
  --timezone=<value>  (required) Timezone to set
  --verbose           Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set the timezone for a dataset

  Prints a confirmation; --json or --output csv prints the updated dataset instead.

EXAMPLES
  $ databox dataset set-timezone 12345 --timezone "US/Eastern"

  $ databox dataset set-timezone 12345 --timezone "Europe/London" --json
```

_See code: [src/commands/dataset/set-timezone.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-timezone.ts)_

## `databox dataset set-verification DATASETID`

Set verification status for a dataset

```
USAGE
  $ databox dataset set-verification DATASETID --status verified|unverified [--no-color] [--output table|json|csv | --json]
    [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --status=<option>  (required) Verification status
                     <options: verified|unverified>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set verification status for a dataset

  Prints a confirmation; --json or --output csv prints the resulting verification (isVerified, verifiedAt, verifiedBy)
  instead.

EXAMPLES
  $ databox dataset set-verification 12345 --status verified

  $ databox dataset set-verification 12345 --status unverified --json
```

_See code: [src/commands/dataset/set-verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-verification.ts)_

## `databox dataset sync-frequency-options DATASETID`

List the sync frequencies a dataset can be set to, and which your plan includes

```
USAGE
  $ databox dataset sync-frequency-options DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List the sync frequencies a dataset can be set to, and which your plan includes

EXAMPLES
  $ databox dataset sync-frequency-options 12345

  $ databox dataset sync-frequency-options 12345 --json
```

_See code: [src/commands/dataset/sync-frequency-options.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/sync-frequency-options.ts)_

## `databox dataset sync-history DATASETID`

Show sync history for a dataset

```
USAGE
  $ databox dataset sync-history DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page
    <value>] [--page-size <value>]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show sync history for a dataset

EXAMPLES
  $ databox dataset sync-history 12345

  $ databox dataset sync-history 12345 --page 0 --page-size 10

  $ databox dataset sync-history 12345 --json
```

_See code: [src/commands/dataset/sync-history.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/sync-history.ts)_

## `databox dataset sync-statistics DATASETID`

Show sync history statistics for a dataset

```
USAGE
  $ databox dataset sync-statistics DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show sync history statistics for a dataset

EXAMPLES
  $ databox dataset sync-statistics 12345

  $ databox dataset sync-statistics 12345 --json
```

_See code: [src/commands/dataset/sync-statistics.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/sync-statistics.ts)_

## `databox dataset update DATASETID`

Update a dataset

```
USAGE
  $ databox dataset update DATASETID [--no-color] [--output table|json|csv | --json] [--verbose] [--name <value>]

ARGUMENTS
  DATASETID  The dataset ID to update

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --name=<value>     New name for the dataset
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update a dataset

EXAMPLES
  $ databox dataset update 12345 --name "New Name"

  $ databox dataset update 12345 --name "New Name" --json
```

_See code: [src/commands/dataset/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/update.ts)_

## `databox dataset update-modification DATASETID`

Create or replace a dataset's modification

```
USAGE
  $ databox dataset update-modification DATASETID --data <value> [--no-color] [--output table|json|csv | --json] [--verbose]
    [--idempotency-key <value>]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --data=<value>             (required) JSON modification definition: filters, formulas, displayNames, dataTypes, order,
                             visibility
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Create or replace a dataset's modification

  This replaces the whole definition: a field left out of --data is cleared, not kept. To change part of it, start from
  "dataset modifications <id> --json" and send it back edited.

  --data takes any of these keys:
  - filters: per column, {"logicalOperator": "AND", "conditions": [{"type": "greater_than", "value": 100}]}
  - formulas: computed columns, {"<col>": "$amount * 1.2"}
  - displayNames: column renames, {"<col>": "Revenue"}
  - dataTypes: per column, {"outputLogicalType": "currency", "inputFormat": ..., "outputFormat": {"type": ..., "scale":
  ...}}, the last two optional
  - order: column IDs in display order
  - visibility: {"<col>": false} hides a column

  Prints the saved definition, one row per column as "dataset modifications" does.

  "dataset modification-rules" lists the filter operators and type conversions each column type accepts; "dataset
  modification-functions" lists the formula functions.

EXAMPLES
  $ databox dataset update-modification 12345 --data '{"filters":{"amount":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}'

  $ databox dataset update-modification 12345 --data '{"formulas":{"totalWithTax":"$amount * 1.2"},"displayNames":{"amount":"Revenue"}}'

  $ databox dataset update-modification 12345 --data '{"dataTypes":{"amount":{"outputLogicalType":"currency"}},"visibility":{"orderId":false}}' --json
```

_See code: [src/commands/dataset/update-modification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/update-modification.ts)_

## `databox dataset verification DATASETID`

Get verification status for a dataset

```
USAGE
  $ databox dataset verification DATASETID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get verification status for a dataset

EXAMPLES
  $ databox dataset verification 12345

  $ databox dataset verification 12345 --json
```

_See code: [src/commands/dataset/verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/verification.ts)_

## `databox help [COMMAND]`

Display help for databox.

```
USAGE
  $ databox help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for databox.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.37/src/commands/help.ts)_

## `databox integration get INTEGRATIONID`

Get integration details

```
USAGE
  $ databox integration get INTEGRATIONID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  INTEGRATIONID  The integration ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get integration details

EXAMPLES
  $ databox integration get 101

  $ databox integration get 101 --json
```

_See code: [src/commands/integration/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/integration/get.ts)_

## `databox integration list`

List available integrations

```
USAGE
  $ databox integration list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--search <value>] [--sort-by name] [--sort-order asc|desc]

FLAGS
  --all                  Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --page=<value>         Page number (0-indexed)
  --page-size=<value>    Number of items per page (max 100)
  --search=<value>       Search by integration name
  --sort-by=<option>     Field to sort by
                         <options: name>
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List available integrations

EXAMPLES
  $ databox integration list

  $ databox integration list --search google

  $ databox integration list --json
```

_See code: [src/commands/integration/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/integration/list.ts)_

## `databox metric create`

Create a custom metric on a dataset

```
USAGE
  $ databox metric create --dataset-id <value> --date <value> --measure <value> --name <value> [--no-color]
    [--output table|json|csv | --json] [--verbose] [--aggregation-function sum|avg|min|max|count] [--dimension
    <value>...] [--filters <value>] [--idempotency-key <value>]

FLAGS
  --aggregation-function=<option>  [default: sum] Aggregation applied to the measure
                                   <options: sum|avg|min|max|count>
  --dataset-id=<value>             (required) Dataset ID to create the metric on (a dataset, not a data source)
  --date=<value>                   (required) Date column reference as JSON ({"id":"amount","displayName":"Amount"})
  --dimension=<value>...           Dimension column reference as JSON ({"id":"amount","displayName":"Amount"}); repeat
                                   for several
  --filters=<value>                Filters as JSON: {logicalOperator: and|or, conditions: [{field, operator, values}]},
                                   e.g. {"logicalOperator":"and","conditions":[{"field":"country","operator":"ANY_OF","v
                                   alues":["US","UK"]}]}
  --idempotency-key=<value>        A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                                   returns the first response instead of repeating the action
  --json                           Output as JSON (shorthand for --output json)
  --measure=<value>                (required) Measure column reference as JSON ({"id":"amount","displayName":"Amount"})
  --name=<value>                   (required) Name of the metric
  --no-color                       Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>                [default: table] Output format
                                   <options: table|json|csv>
  --verbose                        Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Create a custom metric on a dataset

  Column references are {"id","displayName"}, with the id taken from "dataset schema". --filters is one group of
  conditions with a shared logicalOperator (and or or). Prints the new metric as "metric get" does.

EXAMPLES
  $ databox metric create --name "Revenue" --dataset-id 123 --measure '{"id":"amount","displayName":"Amount"}' --date '{"id":"created_at","displayName":"Created At"}'

  $ databox metric create --name "Revenue by country" --dataset-id 123 --measure '{"id":"amount","displayName":"Amount"}' --date '{"id":"created_at","displayName":"Created At"}' --aggregation-function avg --dimension '{"id":"country","displayName":"Country"}'

  $ databox metric create --name "US revenue" --dataset-id 123 --measure '{"id":"amount","displayName":"Amount"}' --date '{"id":"created_at","displayName":"Created At"}' --filters '{"logicalOperator":"and","conditions":[{"field":"country","operator":"ANY_OF","values":["US","UK"]}]}' --json
```

_See code: [src/commands/metric/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/create.ts)_

## `databox metric delete METRICID`

Delete a metric

```
USAGE
  $ databox metric delete METRICID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  METRICID  The metric ID to delete

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Delete a metric

EXAMPLES
  $ databox metric delete "500|custom_query_100"

  $ databox metric delete "500|custom_query_100" --force
```

_See code: [src/commands/metric/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/delete.ts)_

## `databox metric dimension-values`

Get the values of a metric's dimension

```
USAGE
  $ databox metric dimension-values --dimension-id <value> --metric-id <value> --source-id <value> [--no-color] [--output
    table|json|csv | --json] [--verbose]

FLAGS
  --dimension-id=<value>  (required) Dimension id to list the values of
  --json                  Output as JSON (shorthand for --output json)
  --metric-id=<value>     (required) Metric ID
  --no-color              Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>       [default: table] Output format
                          <options: table|json|csv>
  --source-id=<value>     (required) The data source or dataset the metric belongs to (the sourceId shown by "metric
                          list")
  --verbose               Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get the values of a metric's dimension

  --dimension-id is a dimension id from "metric get" or "metric list". It takes one: the API accepts a list but only
  honours the first entry. An unknown dimension is rejected with the metric's available dimensions.

EXAMPLES
  $ databox metric dimension-values --metric-id "500|custom_query_100" --source-id 500 --dimension-id country

  $ databox metric dimension-values --metric-id "GoogleAnalytics4@sessions" --source-id 42 --dimension-id country --json
```

_See code: [src/commands/metric/dimension-values.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/dimension-values.ts)_

## `databox metric drilldown`

Get the rows behind a metric's value

```
USAGE
  $ databox metric drilldown --end-timestamp <value> --metric-id <value> --source-id <value> --start-timestamp <value>
    [--no-color] [--output table|json|csv | --json] [--verbose] [--dimension-id <value>...] [--filters <value>] [--all |
    --page <value>] [--page-size <value>] [--sort-by <value>] [--sort-order asc|desc]

FLAGS
  --all                      Fetch every page (100 items per request unless --page-size is given) and print them as one
                             list
  --dimension-id=<value>...  Dimension id the metric is broken down by (repeat for several)
  --end-timestamp=<value>    (required) End of the period (Unix timestamp, seconds)
  --filters=<value>          Filters as JSON: {logicalOperator, groups: [{logicalOperator, conditions: [{type, field,
                             operator, values}]}]}, e.g. {"logicalOperator":"AND","groups":[{"logicalOperator":"AND","co
                             nditions":[{"type":"dimension","field":"country","operator":"ANY_OF","values":["US"]}]}]}
  --json                     Output as JSON (shorthand for --output json)
  --metric-id=<value>        (required) Metric ID
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --page=<value>             Page number (0-indexed)
  --page-size=<value>        Number of items per page (max 1000)
  --sort-by=<value>          Field to sort by
  --sort-order=<option>      Sort direction
                             <options: asc|desc>
  --source-id=<value>        (required) The dataset the metric belongs to (the sourceId shown by "metric list")
  --start-timestamp=<value>  (required) Start of the period (Unix timestamp, seconds)
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get the rows behind a metric's value

  Only dataset-backed custom metrics support drilldown; check "Drilldown" in "metric list" or "metric get". To reproduce
  what a databoard shows, pass the same --dimension-id and --filters its datablock uses ("databoard metrics" reports
  both); without them you get every row in the period. Columns follow the response schema, headed by display name;
  --sort-by takes a column id. --json returns the whole response: the rows under "items", with "schema" and
  "pagination".

EXAMPLES
  $ databox metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600

  $ databox metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600 --dimension-id country --sort-by amount --sort-order desc

  $ databox metric drilldown --metric-id "500|custom_query_100" --source-id 500 --start-timestamp 1704067200 --end-timestamp 1706745600 --filters '{"logicalOperator":"AND","groups":[{"logicalOperator":"AND","conditions":[{"type":"dimension","field":"country","operator":"ANY_OF","values":["US"]}]}]}' --json
```

_See code: [src/commands/metric/drilldown.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/drilldown.ts)_

## `databox metric get METRICID`

Get metric details

```
USAGE
  $ databox metric get METRICID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  METRICID  The metric ID (e.g., "500|custom_query_100")

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get metric details

  Type is event, general, current, or unknown when the metric's definition could not be read. Measure, date, aggregation
  and filters describe a custom-query metric's definition and are empty for integration and push metrics.

EXAMPLES
  $ databox metric get "500|custom_query_100"

  $ databox metric get "GoogleAnalytics4@sessions" --json
```

_See code: [src/commands/metric/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/get.ts)_

## `databox metric lineage METRICID`

Show metric lineage (parents and children)

```
USAGE
  $ databox metric lineage METRICID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  METRICID  The metric ID (e.g., "500|custom_query_100")

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show metric lineage (parents and children)

  Parents are what the metric is built from: the metrics a calculated metric reads, otherwise its dataset or data
  source. Children are the calculated metrics that read it; use "metric usages" for databoards and the like. Type is
  dataSource, dataset, mergedDataset, basicMetric or customMetric, the same as "dataset lineage". A metric that is not
  built on a dataset has no lineage and returns 404.

EXAMPLES
  $ databox metric lineage "500|custom_query_100"

  $ databox metric lineage "500|script_7" --json
```

_See code: [src/commands/metric/lineage.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/lineage.ts)_

## `databox metric list`

List metrics

```
USAGE
  $ databox metric list [--no-color] [--output table|json|csv | --json] [--verbose] [--source-id <value>] [--all
    | --page <value>] [--page-size <value>] [--search <value>]

FLAGS
  --all                Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json               Output as JSON (shorthand for --output json)
  --no-color           Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>    [default: table] Output format
                       <options: table|json|csv>
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page (max 100)
  --search=<value>     Search by metric name or ID
  --source-id=<value>  Filter by source ID (data source or dataset)
  --verbose            Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List metrics

EXAMPLES
  $ databox metric list

  $ databox metric list --source-id 42

  $ databox metric list --search revenue

  $ databox metric list --json
```

_See code: [src/commands/metric/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/list.ts)_

## `databox metric set-verification METRICID`

Set metric verification status

```
USAGE
  $ databox metric set-verification METRICID --status verified|unverified [--no-color] [--output table|json|csv | --json]
    [--verbose]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --status=<option>  (required) Verification status
                     <options: verified|unverified>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Set metric verification status

  The metric ID must carry its source ("500|custom_query_100"): an integration key without "|", such as
  "GoogleAnalytics4@sessions", is rejected with a 400. Prints a confirmation; --json or --output csv prints the
  resulting verification (isVerified, verifiedAt, verifiedBy) instead.

EXAMPLES
  $ databox metric set-verification "500|custom_query_100" --status verified

  $ databox metric set-verification "500|custom_query_100" --status unverified --json
```

_See code: [src/commands/metric/set-verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/set-verification.ts)_

## `databox metric update METRICID`

Update a custom metric

```
USAGE
  $ databox metric update METRICID [--no-color] [--output table|json|csv | --json] [--verbose]
    [--aggregation-function sum|avg|min|max|count] [--clear-dimensions | --dimension <value>...] [--date <value>]
    [--filters <value>] [--measure <value>] [--name <value>]

ARGUMENTS
  METRICID  The metric ID to update

FLAGS
  --aggregation-function=<option>  New aggregation applied to the measure
                                   <options: sum|avg|min|max|count>
  --clear-dimensions               Remove every dimension (sends "dimensions": [])
  --date=<value>                   New date column reference as JSON ({"id":"amount","displayName":"Amount"})
  --dimension=<value>...           Dimension column reference as JSON ({"id":"amount","displayName":"Amount"}); repeat
                                   for several. Replaces the current dimensions
  --filters=<value>                Filters as JSON: {logicalOperator: and|or, conditions: [{field, operator, values}]}.
                                   Omit conditions to keep them; [] clears them
  --json                           Output as JSON (shorthand for --output json)
  --measure=<value>                New measure column reference as JSON ({"id":"amount","displayName":"Amount"})
  --name=<value>                   New name for the metric
  --no-color                       Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>                [default: table] Output format
                                   <options: table|json|csv>
  --verbose                        Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update a custom metric

  Only custom-query metrics can be updated. Fields you omit keep their current values. --dimension replaces the whole
  dimension list, and --clear-dimensions removes it. In --filters, omitting "conditions" keeps the stored ones, so
  "logicalOperator" can be changed on its own; "conditions": [] clears them. Prints the updated metric as "metric get"
  does.

EXAMPLES
  $ databox metric update "500|custom_query_100" --name "New Name"

  $ databox metric update "500|custom_query_100" --measure '{"id":"amount","displayName":"Amount"}' --aggregation-function avg

  $ databox metric update "500|custom_query_100" --filters '{"logicalOperator":"and","conditions":[{"field":"country","operator":"ANY_OF","values":["US","UK"]}]}'

  $ databox metric update "500|custom_query_100" --filters '{"logicalOperator":"or"}'

  $ databox metric update "500|custom_query_100" --clear-dimensions

  $ databox metric update "500|custom_query_100" --filters '{"conditions":[]}' --json
```

_See code: [src/commands/metric/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/update.ts)_

## `databox metric usages METRICID`

Get where a metric is used

```
USAGE
  $ databox metric usages METRICID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get where a metric is used

  Type is board, alert, goal, report, forecast, scorecard or calculatedMetric. Only custom-query metrics (IDs like
  "500|custom_query_100") are looked up: for any other metric the list is always empty, as it is for a metric whose
  query has since been deleted.

EXAMPLES
  $ databox metric usages "500|custom_query_100"

  $ databox metric usages "500|custom_query_100" --json
```

_See code: [src/commands/metric/usages.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/usages.ts)_

## `databox metric verification METRICID`

Get metric verification status

```
USAGE
  $ databox metric verification METRICID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get metric verification status

  The metric ID must carry its source ("500|custom_query_100"): an integration key without "|", such as
  "GoogleAnalytics4@sessions", is rejected with a 400.

EXAMPLES
  $ databox metric verification "500|custom_query_100"

  $ databox metric verification "500|custom_query_100" --json
```

_See code: [src/commands/metric/verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/verification.ts)_

## `databox organization countries`

List available countries

```
USAGE
  $ databox organization countries [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List available countries

EXAMPLES
  $ databox organization countries

  $ databox organization countries --json
```

_See code: [src/commands/organization/countries.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/countries.ts)_

## `databox organization info`

Show your organization details

```
USAGE
  $ databox organization info [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show your organization details

EXAMPLES
  $ databox organization info

  $ databox organization info --json
```

_See code: [src/commands/organization/info.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/info.ts)_

## `databox organization metadata-options`

List available metadata options for organization settings

```
USAGE
  $ databox organization metadata-options [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List available metadata options for organization settings

EXAMPLES
  $ databox organization metadata-options

  $ databox organization metadata-options --json
```

_See code: [src/commands/organization/metadata-options.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/metadata-options.ts)_

## `databox organization timezones`

List all supported timezones

```
USAGE
  $ databox organization timezones [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List all supported timezones

EXAMPLES
  $ databox organization timezones

  $ databox organization timezones --json
```

_See code: [src/commands/organization/timezones.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/timezones.ts)_

## `databox organization update`

Update organization details

```
USAGE
  $ databox organization update [--no-color] [--output table|json|csv | --json] [--verbose] [--address <value>]
    [--billing-name <value>] [--company-name <value>] [--metadata <value>] [--name <value>] [--settings <value>]
    [--tax-number <value>] [--website-url <value>]

FLAGS
  --address=<value>       JSON object: {street, zip, city, state, country}
  --billing-name=<value>  Billing name
  --company-name=<value>  Company name
  --json                  Output as JSON (shorthand for --output json)
  --metadata=<value>      JSON object: {industry, businessType, companySize, annualRevenue}
  --name=<value>          Organization name
  --no-color              Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>       [default: table] Output format
                          <options: table|json|csv>
  --settings=<value>      JSON object: {dateFormat, numberFormat, firstDayOfWeek, calendar, fiscalYearStart: {month,
                          day}}
  --tax-number=<value>    Tax number
  --verbose               Print each request and response (method, URL, status, duration, request ID) to stderr
  --website-url=<value>   Website URL

DESCRIPTION
  Update organization details

  --settings takes {dateFormat, numberFormat, firstDayOfWeek, calendar, fiscalYearStart}:
  - numberFormat: GroupingCommaDecimalDot (1,234.5), GroupingDotDecimalComma (1.234,5), GroupingSpaceDecimalComma (1
  234,5) or GroupingSpaceDecimalDot (1 234.5). An unrecognised value is stored as GroupingCommaDecimalDot.
  - firstDayOfWeek: sunday, monday, tuesday, wednesday, thursday, friday or saturday. An unrecognised value keeps the
  current day.
  - calendar: gregorian, customFiscal or weekAlignedFiscal.
  - fiscalYearStart: {month, day}, for a fiscal calendar only; switching to gregorian clears it.

EXAMPLES
  $ databox organization update --name "My Company"

  $ databox organization update --company-name "Acme Inc" --json

  $ databox organization update --settings '{"calendar":"customFiscal","fiscalYearStart":{"month":4,"day":1}}'
```

_See code: [src/commands/organization/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/update.ts)_

## `databox organization usage`

Show organization usage statistics

```
USAGE
  $ databox organization usage [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show organization usage statistics

EXAMPLES
  $ databox organization usage

  $ databox organization usage --json
```

_See code: [src/commands/organization/usage.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/organization/usage.ts)_

## `databox profile info`

Show your profile

```
USAGE
  $ databox profile info [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Show your profile

EXAMPLES
  $ databox profile info

  $ databox profile info --json
```

_See code: [src/commands/profile/info.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/profile/info.ts)_

## `databox profile metadata-options`

List available departments and roles for profile metadata

```
USAGE
  $ databox profile metadata-options [--no-color] [--output table|json|csv | --json] [--verbose]

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List available departments and roles for profile metadata

EXAMPLES
  $ databox profile metadata-options

  $ databox profile metadata-options --json
```

_See code: [src/commands/profile/metadata-options.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/profile/metadata-options.ts)_

## `databox profile update`

Update your profile

```
USAGE
  $ databox profile update [--no-color] [--output table|json|csv | --json] [--verbose] [--metadata <value>] [--name
    <value>] [--timezone <value>]

FLAGS
  --json              Output as JSON (shorthand for --output json)
  --metadata=<value>  JSON object: {department, title, role}; "" clears a field
  --name=<value>      New display name
  --no-color          Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>   [default: table] Output format
                      <options: table|json|csv>
  --timezone=<value>  New timezone
  --verbose           Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update your profile

  --metadata takes {department, title, role}. department and role must be values from "profile metadata-options", and a
  role must belong to the department; title is free text. A field left out keeps its value, and "" clears it. Clearing
  department requires clearing role in the same call: {"department":"","role":""}.

EXAMPLES
  $ databox profile update --name "New Name"

  $ databox profile update --timezone "US/Eastern"

  $ databox profile update --name "New Name" --timezone "UTC" --json

  $ databox profile update --metadata '{"department":"engineering","role":"software_engineer"}'

  $ databox profile update --metadata '{"department":"","role":""}'
```

_See code: [src/commands/profile/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/profile/update.ts)_

## `databox user delete USERID`

Remove a user from the organization

```
USAGE
  $ databox user delete USERID [--no-color] [--output table|json|csv | --json] [--verbose] [--force]

ARGUMENTS
  USERID  The user ID to remove

FLAGS
  --force            Skip confirmation prompt
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Remove a user from the organization

EXAMPLES
  $ databox user delete 12345

  $ databox user delete 12345 --force
```

_See code: [src/commands/user/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/delete.ts)_

## `databox user get USERID`

Get user details

```
USAGE
  $ databox user get USERID [--no-color] [--output table|json|csv | --json] [--verbose]

ARGUMENTS
  USERID  The user ID

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Get user details

EXAMPLES
  $ databox user get 12345

  $ databox user get 12345 --json
```

_See code: [src/commands/user/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/get.ts)_

## `databox user invite`

Invite a user to the organization

```
USAGE
  $ databox user invite --email <value> --role admin|user|editor|viewer [--no-color] [--output table|json|csv |
    --json] [--verbose] [--idempotency-key <value>] [--name <value>]

FLAGS
  --email=<value>            (required) Email address of the user to invite
  --idempotency-key=<value>  A UUID sent as the Idempotency-Key header: a retry with the same key within 24 hours
                             returns the first response instead of repeating the action
  --json                     Output as JSON (shorthand for --output json)
  --name=<value>             Display name for the new user
  --no-color                 Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>          [default: table] Output format
                             <options: table|json|csv>
  --role=<option>            (required) Role for the new user
                             <options: admin|user|editor|viewer>
  --verbose                  Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Invite a user to the organization

  An email already in the organization, invited or active, is refused with duplicate_record; change that user with "user
  update" instead.

EXAMPLES
  $ databox user invite --email user@example.com --role user

  $ databox user invite --email admin@example.com --role admin --json
```

_See code: [src/commands/user/invite.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/invite.ts)_

## `databox user list`

List users in the organization

```
USAGE
  $ databox user list [--no-color] [--output table|json|csv | --json] [--verbose] [--all | --page <value>]
    [--page-size <value>] [--role admin|user|editor|viewer] [--search <value>] [--sort-by <value>] [--sort-order
    asc|desc]

FLAGS
  --all                  Fetch every page (100 items per request unless --page-size is given) and print them as one list
  --json                 Output as JSON (shorthand for --output json)
  --no-color             Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>      [default: table] Output format
                         <options: table|json|csv>
  --page=<value>         Page number (0-indexed)
  --page-size=<value>    Number of items per page (max 100)
  --role=<option>        Filter by role
                         <options: admin|user|editor|viewer>
  --search=<value>       Search by name or email
  --sort-by=<value>      Field to sort by
  --sort-order=<option>  Sort direction
                         <options: asc|desc>
  --verbose              Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  List users in the organization

EXAMPLES
  $ databox user list

  $ databox user list --role editor

  $ databox user list --json
```

_See code: [src/commands/user/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/list.ts)_

## `databox user update USERID`

Update a user's name or role

```
USAGE
  $ databox user update USERID [--no-color] [--output table|json|csv | --json] [--verbose] [--name <value>]
    [--role admin|user|editor|viewer]

ARGUMENTS
  USERID  The user ID to update

FLAGS
  --json             Output as JSON (shorthand for --output json)
  --name=<value>     New display name for the user
  --no-color         Disable coloured output (a non-empty NO_COLOR environment variable does the same)
  --output=<option>  [default: table] Output format
                     <options: table|json|csv>
  --role=<option>    New role for the user
                     <options: admin|user|editor|viewer>
  --verbose          Print each request and response (method, URL, status, duration, request ID) to stderr

DESCRIPTION
  Update a user's name or role

EXAMPLES
  $ databox user update 12345 --role admin

  $ databox user update 12345 --role viewer --json

  $ databox user update 12345 --name "Jane Doe"
```

_See code: [src/commands/user/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/update.ts)_
<!-- commandsstop -->
