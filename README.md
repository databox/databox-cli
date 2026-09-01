# databox-cli

CLI for the [Databox](https://databox.com) V2 API. Manage accounts, data sources, datasets, metrics, connections, users, billing, and more — all from the terminal.

## Installation

```bash
npm install -g databox-cli
```

## Getting Started

```bash
# Authenticate with your API key
databox auth login

# Verify your key works
databox auth validate

# View your account
databox account info

# List data sources
databox data-source list

# Create a data source and dataset
databox data-source create --title "My Data Source"
databox dataset create --title "My Dataset" --data-source-id 12345

# Push data into a dataset
databox dataset ingest 67890 --file data.json

# List metrics
databox metric list
```

## Authentication

All commands (except `auth login`) require an API key. Run `databox auth login` to store your key in `~/.config/databox-cli/config.json`.

You can also pass the key inline:

```bash
databox auth login --api-key YOUR_API_KEY
```

## Global Flags

| Flag | Env Var | Description |
|------|---------|-------------|
| `--json` | — | Output as JSON instead of table |
| `--api-key` | `DATABOX_API_KEY` | Override the stored API key |
| `--api-url` | `DATABOX_API_URL` | Override the API base URL |
| `--account-id` | `DATABOX_ACCOUNT_ID` | Target a specific account (for agency/client access) |

## Output Formats

By default, commands output human-readable tables. Add `--json` to any command for machine-readable JSON output:

```bash
databox account info --json
databox data-source list --json
```

## Multi-Account Access

For agency accounts managing client accounts, use the `--account-id` flag to scope commands to a specific client:

```bash
# List your client accounts
databox client list

# List data sources for a specific client
databox data-source list --account-id 12345
```

## Agent Skills

This package includes shareable skills for AI agents (like [Claude Code](https://claude.ai/claude-code)) to use the CLI autonomously.

### Bundled Skills

| Skill | Description |
|-------|-------------|
| `databox-auth` | Authentication setup and API key validation |
| `databox-account` | Account info, usage, settings, timezones |
| `databox-data-sources` | Data source CRUD, timezone, sync, permissions, purge |
| `databox-datasets` | Dataset CRUD, schema, data ingestion, metadata, verification, modifications |
| `databox-metrics` | Metric CRUD, data loading, dimensions, drilldown, verification |
| `databox-users` | User invite, role management, removal |
| `databox-clients` | Client account management (agency model) |
| `databox-connections` | Connection management and permissions |
| `databox-integrations` | Browse available integration types |
| `databox-billing` | Billing info and invoices |
| `databox-analyze` | Dataset analysis with Genie AI, conversational data Q&A |

### Install Skills

Install all skills at once using [npx skills](https://github.com/anthropics/skills):

```bash
npx skills add databox/databox-cli --skill '*'
```

Or install individual skills:

```bash
npx skills add databox/databox-cli --skill databox-auth
npx skills add databox/databox-cli --skill databox-account
npx skills add databox/databox-cli --skill databox-data-sources
npx skills add databox/databox-cli --skill databox-datasets
npx skills add databox/databox-cli --skill databox-metrics
npx skills add databox/databox-cli --skill databox-users
npx skills add databox/databox-cli --skill databox-clients
npx skills add databox/databox-cli --skill databox-connections
npx skills add databox/databox-cli --skill databox-integrations
npx skills add databox/databox-cli --skill databox-billing
npx skills add databox/databox-cli --skill databox-analyze
```

Once installed, Claude Code can manage your Databox resources directly — managing accounts, data sources, datasets, metrics, users, connections, billing, and analyzing data with Genie AI.

## Commands

<!-- commands -->
* [`databox account data-sources`](#databox-account-data-sources)
* [`databox account datasets`](#databox-account-datasets)
* [`databox account info`](#databox-account-info)
* [`databox account timezones`](#databox-account-timezones)
* [`databox account update`](#databox-account-update)
* [`databox account usage`](#databox-account-usage)
* [`databox activity-log list`](#databox-activity-log-list)
* [`databox analyze ask-genie DATASETID QUESTION`](#databox-analyze-ask-genie-datasetid-question)
* [`databox auth login`](#databox-auth-login)
* [`databox auth validate`](#databox-auth-validate)
* [`databox billing info`](#databox-billing-info)
* [`databox billing invoices`](#databox-billing-invoices)
* [`databox client create`](#databox-client-create)
* [`databox client delete CLIENTID`](#databox-client-delete-clientid)
* [`databox client get CLIENTID`](#databox-client-get-clientid)
* [`databox client list`](#databox-client-list)
* [`databox client update CLIENTID`](#databox-client-update-clientid)
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
* [`databox data-source sync-frequencies DATASOURCEID`](#databox-data-source-sync-frequencies-datasourceid)
* [`databox data-source update DATASOURCEID`](#databox-data-source-update-datasourceid)
* [`databox databoard list`](#databox-databoard-list)
* [`databox databoard metrics DATABOARDID`](#databox-databoard-metrics-databoardid)
* [`databox dataset add-modification DATASETID`](#databox-dataset-add-modification-datasetid)
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
* [`databox dataset list`](#databox-dataset-list)
* [`databox dataset metadata DATASETID`](#databox-dataset-metadata-datasetid)
* [`databox dataset modifications DATASETID`](#databox-dataset-modifications-datasetid)
* [`databox dataset permissions DATASETID`](#databox-dataset-permissions-datasetid)
* [`databox dataset purge DATASETID`](#databox-dataset-purge-datasetid)
* [`databox dataset schema DATASETID`](#databox-dataset-schema-datasetid)
* [`databox dataset set-column-metadata DATASETID`](#databox-dataset-set-column-metadata-datasetid)
* [`databox dataset set-metadata DATASETID`](#databox-dataset-set-metadata-datasetid)
* [`databox dataset set-permissions DATASETID`](#databox-dataset-set-permissions-datasetid)
* [`databox dataset set-sync-frequency DATASETID`](#databox-dataset-set-sync-frequency-datasetid)
* [`databox dataset set-timezone DATASETID`](#databox-dataset-set-timezone-datasetid)
* [`databox dataset set-verification DATASETID`](#databox-dataset-set-verification-datasetid)
* [`databox dataset sync-frequencies DATASETID`](#databox-dataset-sync-frequencies-datasetid)
* [`databox dataset sync-history DATASETID`](#databox-dataset-sync-history-datasetid)
* [`databox dataset update DATASETID`](#databox-dataset-update-datasetid)
* [`databox dataset verification DATASETID`](#databox-dataset-verification-datasetid)
* [`databox help [COMMAND]`](#databox-help-command)
* [`databox integration get INTEGRATIONID`](#databox-integration-get-integrationid)
* [`databox integration list`](#databox-integration-list)
* [`databox metric create`](#databox-metric-create)
* [`databox metric data`](#databox-metric-data)
* [`databox metric delete METRICID`](#databox-metric-delete-metricid)
* [`databox metric dimension-values`](#databox-metric-dimension-values)
* [`databox metric drilldown`](#databox-metric-drilldown)
* [`databox metric get METRICID`](#databox-metric-get-metricid)
* [`databox metric list`](#databox-metric-list)
* [`databox metric set-verification METRICID`](#databox-metric-set-verification-metricid)
* [`databox metric update METRICID`](#databox-metric-update-metricid)
* [`databox metric usages METRICID`](#databox-metric-usages-metricid)
* [`databox metric verification METRICID`](#databox-metric-verification-metricid)
* [`databox profile info`](#databox-profile-info)
* [`databox profile update`](#databox-profile-update)
* [`databox user delete USERID`](#databox-user-delete-userid)
* [`databox user get USERID`](#databox-user-get-userid)
* [`databox user invite`](#databox-user-invite)
* [`databox user list`](#databox-user-list)
* [`databox user update USERID`](#databox-user-update-userid)

## `databox account data-sources`

List data sources for the current account

```
USAGE
  $ databox account data-sources [--json] [--page <value>] [--page-size <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page

DESCRIPTION
  List data sources for the current account

EXAMPLES
  $ databox account data-sources

  $ databox account data-sources --page 0 --page-size 10

  $ databox account data-sources --json
```

_See code: [src/commands/account/data-sources.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/data-sources.ts)_

## `databox account datasets`

List datasets for the current account

```
USAGE
  $ databox account datasets [--json] [--page <value>] [--page-size <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page

DESCRIPTION
  List datasets for the current account

EXAMPLES
  $ databox account datasets

  $ databox account datasets --page 0 --page-size 20

  $ databox account datasets --json
```

_See code: [src/commands/account/datasets.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/datasets.ts)_

## `databox account info`

Show your account details

```
USAGE
  $ databox account info [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  Show your account details

EXAMPLES
  $ databox account info

  $ databox account info --json
```

_See code: [src/commands/account/info.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/info.ts)_

## `databox account timezones`

List all supported timezones

```
USAGE
  $ databox account timezones [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  List all supported timezones

EXAMPLES
  $ databox account timezones

  $ databox account timezones --json
```

_See code: [src/commands/account/timezones.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/timezones.ts)_

## `databox account update`

Update account details

```
USAGE
  $ databox account update [--json] [--company-name <value>] [--name <value>]

FLAGS
  --company-name=<value>  Company name
  --json                  Output as JSON
  --name=<value>          Account name

DESCRIPTION
  Update account details

EXAMPLES
  $ databox account update --name "My Company"

  $ databox account update --company-name "Acme Inc" --json
```

_See code: [src/commands/account/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/update.ts)_

## `databox account usage`

Show account usage statistics

```
USAGE
  $ databox account usage [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  Show account usage statistics

EXAMPLES
  $ databox account usage

  $ databox account usage --json
```

_See code: [src/commands/account/usage.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/account/usage.ts)_

## `databox activity-log list`

List activity log entries

```
USAGE
  $ databox activity-log list [--json] [--page <value>] [--page-size <value>] [--resource-type <value>] [--user-id
    <value>]

FLAGS
  --json                   Output as JSON
  --page=<value>           Page number
  --page-size=<value>      Number of items per page
  --resource-type=<value>  Filter by resource type
  --user-id=<value>        Filter by user ID

DESCRIPTION
  List activity log entries

EXAMPLES
  $ databox activity-log list

  $ databox activity-log list --resource-type data_source

  $ databox activity-log list --user-id 123

  $ databox activity-log list --json
```

_See code: [src/commands/activity-log/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/activity-log/list.ts)_

## `databox analyze ask-genie DATASETID QUESTION`

Ask Genie AI a question about a dataset

```
USAGE
  $ databox analyze ask-genie DATASETID QUESTION [--json] [--service-url <value>] [--thread-id <value>]

ARGUMENTS
  DATASETID  The dataset ID to query
  QUESTION   The question to ask Genie

FLAGS
  --json                 Output as JSON
  --service-url=<value>  [default: https://agentic-service.databox.com, env: DATABOX_AGENTIC_SERVICE_URL] Override the
                         agentic service base URL
  --thread-id=<value>    Continue an existing conversation thread

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
  $ databox auth validate [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  Validate the currently stored API key
```

_See code: [src/commands/auth/validate.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/auth/validate.ts)_

## `databox billing info`

Show billing and plan details

```
USAGE
  $ databox billing info [--json]

FLAGS
  --json  Output as JSON

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
  $ databox billing invoices [--json] [--page <value>] [--page-size <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page

DESCRIPTION
  List invoices

EXAMPLES
  $ databox billing invoices

  $ databox billing invoices --json
```

_See code: [src/commands/billing/invoices.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/billing/invoices.ts)_

## `databox client create`

Create a client account

```
USAGE
  $ databox client create --name <value> [--json]

FLAGS
  --json          Output as JSON
  --name=<value>  (required) Name of the client account

DESCRIPTION
  Create a client account

EXAMPLES
  $ databox client create --name "Client Company"

  $ databox client create --name "Client Company" --json
```

_See code: [src/commands/client/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/client/create.ts)_

## `databox client delete CLIENTID`

Delete a client account

```
USAGE
  $ databox client delete CLIENTID [--json] [--force]

ARGUMENTS
  CLIENTID  The client account ID to delete

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

DESCRIPTION
  Delete a client account

EXAMPLES
  $ databox client delete 12345

  $ databox client delete 12345 --force
```

_See code: [src/commands/client/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/client/delete.ts)_

## `databox client get CLIENTID`

Get client account details

```
USAGE
  $ databox client get CLIENTID [--json]

ARGUMENTS
  CLIENTID  The client account ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get client account details

EXAMPLES
  $ databox client get 12345

  $ databox client get 12345 --json
```

_See code: [src/commands/client/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/client/get.ts)_

## `databox client list`

List client accounts

```
USAGE
  $ databox client list [--json] [--page <value>] [--page-size <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page

DESCRIPTION
  List client accounts

EXAMPLES
  $ databox client list

  $ databox client list --json
```

_See code: [src/commands/client/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/client/list.ts)_

## `databox client update CLIENTID`

Update a client account

```
USAGE
  $ databox client update CLIENTID [--json] [--name <value>]

ARGUMENTS
  CLIENTID  The client account ID to update

FLAGS
  --json          Output as JSON
  --name=<value>  New name for the client account

DESCRIPTION
  Update a client account

EXAMPLES
  $ databox client update 12345 --name "New Name"

  $ databox client update 12345 --name "New Name" --json
```

_See code: [src/commands/client/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/client/update.ts)_

## `databox connection delete CONNECTIONID`

Delete a connection

```
USAGE
  $ databox connection delete CONNECTIONID [--json] [--force]

ARGUMENTS
  CONNECTIONID  The connection ID to delete

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

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
  $ databox connection get CONNECTIONID [--json]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --json  Output as JSON

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
  $ databox connection list [--json] [--page <value>] [--page-size <value>] [--search <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page
  --search=<value>     Search by connection name

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
  $ databox connection permissions CONNECTIONID [--json]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --json  Output as JSON

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
  $ databox connection set-permissions CONNECTIONID --access-level <value> [--json]

ARGUMENTS
  CONNECTIONID  The connection ID

FLAGS
  --access-level=<value>  (required) Access level for the connection
  --json                  Output as JSON

DESCRIPTION
  Update connection permissions

EXAMPLES
  $ databox connection set-permissions 12345 --access-level everyone

  $ databox connection set-permissions 12345 --access-level private --json
```

_See code: [src/commands/connection/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/connection/set-permissions.ts)_

## `databox connection update CONNECTIONID`

Update a connection

```
USAGE
  $ databox connection update CONNECTIONID [--json] [--name <value>]

ARGUMENTS
  CONNECTIONID  The connection ID to update

FLAGS
  --json          Output as JSON
  --name=<value>  New name for the connection

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
  $ databox data-source create --title <value> [--json] [--key <value>] [--timezone <value>]

FLAGS
  --json              Output as JSON
  --key=<value>       Integration key for the data source (e.g., Datadoo)
  --timezone=<value>  Timezone for the data source
  --title=<value>     (required) Title of the data source

DESCRIPTION
  Create a new data source

EXAMPLES
  $ databox data-source create --title "My Data Source"

  $ databox data-source create --title "My Data Source" --timezone "US/Eastern"

  $ databox data-source create --title "My Data Source" --key Datadoo

  $ databox data-source create --title "My Data Source" --json
```

_See code: [src/commands/data-source/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/create.ts)_

## `databox data-source datasets DATASOURCEID`

List datasets for a data source

```
USAGE
  $ databox data-source datasets DATASOURCEID [--json] [--page <value>] [--page-size <value>]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page

DESCRIPTION
  List datasets for a data source

EXAMPLES
  $ databox data-source datasets 12345

  $ databox data-source datasets 12345 --page 0 --page-size 10

  $ databox data-source datasets 12345 --json
```

_See code: [src/commands/data-source/datasets.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/datasets.ts)_

## `databox data-source delete DATASOURCEID`

Delete a data source

```
USAGE
  $ databox data-source delete DATASOURCEID [--json] [--force]

ARGUMENTS
  DATASOURCEID  ID of the data source to delete

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

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
  $ databox data-source get DATASOURCEID [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json  Output as JSON

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
  $ databox data-source list [--json] [--page <value>] [--page-size <value>] [--search <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page
  --search=<value>     Search by title

DESCRIPTION
  List all data sources

EXAMPLES
  $ databox data-source list

  $ databox data-source list --search "Google"

  $ databox data-source list --page 0 --page-size 10 --json
```

_See code: [src/commands/data-source/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/list.ts)_

## `databox data-source permissions DATASOURCEID`

Show permissions for a data source

```
USAGE
  $ databox data-source permissions DATASOURCEID [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json  Output as JSON

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
  $ databox data-source purge DATASOURCEID [--json] [--force]

ARGUMENTS
  DATASOURCEID  ID of the data source to purge

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

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
  $ databox data-source set-permissions DATASOURCEID --access-level <value> [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --access-level=<value>  (required) Access level (e.g. everyone, specific_users)
  --json                  Output as JSON

DESCRIPTION
  Set permissions for a data source

EXAMPLES
  $ databox data-source set-permissions 12345 --access-level everyone
```

_See code: [src/commands/data-source/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-permissions.ts)_

## `databox data-source set-sync-frequency DATASOURCEID`

Set the sync frequency for a data source

```
USAGE
  $ databox data-source set-sync-frequency DATASOURCEID --interval <value> [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --interval=<value>  (required) Sync interval in minutes
  --json              Output as JSON

DESCRIPTION
  Set the sync frequency for a data source

EXAMPLES
  $ databox data-source set-sync-frequency 12345 --interval 60
```

_See code: [src/commands/data-source/set-sync-frequency.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-sync-frequency.ts)_

## `databox data-source set-timezone DATASOURCEID`

Set the timezone for a data source

```
USAGE
  $ databox data-source set-timezone DATASOURCEID --timezone <value> [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json              Output as JSON
  --timezone=<value>  (required) Timezone value

DESCRIPTION
  Set the timezone for a data source

EXAMPLES
  $ databox data-source set-timezone 12345 --timezone "US/Eastern"
```

_See code: [src/commands/data-source/set-timezone.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/set-timezone.ts)_

## `databox data-source sync-frequencies DATASOURCEID`

List available sync frequencies for a data source

```
USAGE
  $ databox data-source sync-frequencies DATASOURCEID [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json  Output as JSON

DESCRIPTION
  List available sync frequencies for a data source

EXAMPLES
  $ databox data-source sync-frequencies 12345

  $ databox data-source sync-frequencies 12345 --json
```

_See code: [src/commands/data-source/sync-frequencies.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/sync-frequencies.ts)_

## `databox data-source update DATASOURCEID`

Update a data source

```
USAGE
  $ databox data-source update DATASOURCEID --title <value> [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source to update

FLAGS
  --json           Output as JSON
  --title=<value>  (required) New title for the data source

DESCRIPTION
  Update a data source

EXAMPLES
  $ databox data-source update 12345 --title "New Title"

  $ databox data-source update 12345 --title "New Title" --json
```

_See code: [src/commands/data-source/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/data-source/update.ts)_

## `databox databoard list`

List databoards

```
USAGE
  $ databox databoard list [--json] [--page <value>] [--page-size <value>] [--search <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page
  --search=<value>     Search by databoard name

DESCRIPTION
  List databoards

EXAMPLES
  $ databox databoard list

  $ databox databoard list --search marketing

  $ databox databoard list --json
```

_See code: [src/commands/databoard/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/databoard/list.ts)_

## `databox databoard metrics DATABOARDID`

Get metrics for a databoard

```
USAGE
  $ databox databoard metrics DATABOARDID [--json]

ARGUMENTS
  DATABOARDID  The databoard ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get metrics for a databoard

EXAMPLES
  $ databox databoard metrics 12345

  $ databox databoard metrics 12345 --json
```

_See code: [src/commands/databoard/metrics.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/databoard/metrics.ts)_

## `databox dataset add-modification DATASETID`

Add a modification to a dataset

```
USAGE
  $ databox dataset add-modification DATASETID --data <value> [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --data=<value>  (required) JSON object with modification data (columnId, type, etc.)
  --json          Output as JSON

DESCRIPTION
  Add a modification to a dataset

EXAMPLES
  $ databox dataset add-modification 12345 --data '{"columnId":"revenue","type":"sum"}'
```

_See code: [src/commands/dataset/add-modification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/add-modification.ts)_

## `databox dataset clear-modifications DATASETID`

Clear all modifications from a dataset

```
USAGE
  $ databox dataset clear-modifications DATASETID [--json] [--force]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

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
  $ databox dataset column-metadata DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

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
  $ databox dataset create --data-source-id <value> --title <value> [--json] [--primary-key <value>...] [--schema
    <value>]

FLAGS
  --data-source-id=<value>  (required) ID of the data source to associate with
  --json                    Output as JSON
  --primary-key=<value>...  Primary key column names
  --schema=<value>          JSON string of schema columns (array of {columnId, dataType})
  --title=<value>           (required) Title of the dataset

DESCRIPTION
  Create a new dataset

EXAMPLES
  $ databox dataset create --title "My Dataset" --data-source-id 123

  $ databox dataset create --title "My Dataset" --data-source-id 123 --primary-key date --primary-key campaign

  $ databox dataset create --title "My Dataset" --data-source-id 123 --schema '[{"columnId":"date","dataType":"datetime"},{"columnId":"value","dataType":"number"}]'

  $ databox dataset create --title "My Dataset" --data-source-id 123 --json
```

_See code: [src/commands/dataset/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/create.ts)_

## `databox dataset data DATASETID`

Get data from a dataset

```
USAGE
  $ databox dataset data DATASETID [--json] [--page <value>] [--page-size <value>]

ARGUMENTS
  DATASETID  The dataset ID to get data from

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page

DESCRIPTION
  Get data from a dataset

EXAMPLES
  $ databox dataset data 12345

  $ databox dataset data 12345 --page 0 --page-size 10

  $ databox dataset data 12345 --json
```

_See code: [src/commands/dataset/data.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/data.ts)_

## `databox dataset delete DATASETID`

Delete a dataset

```
USAGE
  $ databox dataset delete DATASETID [--json] [--force]

ARGUMENTS
  DATASETID  The dataset ID to delete

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

DESCRIPTION
  Delete a dataset

EXAMPLES
  $ databox dataset delete 12345

  $ databox dataset delete 12345 --force
```

_See code: [src/commands/dataset/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/delete.ts)_

## `databox dataset duplicate DATASETID`

Duplicate a dataset

```
USAGE
  $ databox dataset duplicate DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID to duplicate

FLAGS
  --json  Output as JSON

DESCRIPTION
  Duplicate a dataset

EXAMPLES
  $ databox dataset duplicate 12345

  $ databox dataset duplicate 12345 --json
```

_See code: [src/commands/dataset/duplicate.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/duplicate.ts)_

## `databox dataset get DATASETID`

Get details of a specific dataset

```
USAGE
  $ databox dataset get DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID to retrieve

FLAGS
  --json  Output as JSON

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
  $ databox dataset ingest DATASETID [--json] [--file <value> | --records <value>]

ARGUMENTS
  DATASETID  The dataset ID to ingest data into

FLAGS
  --file=<value>     Path to a JSON file containing records array
  --json             Output as JSON
  --records=<value>  Inline JSON array of records

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
  $ databox dataset ingestion DATASETID INGESTIONID [--json]

ARGUMENTS
  DATASETID    The dataset ID
  INGESTIONID  The ingestion ID to retrieve

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get details of a specific ingestion

EXAMPLES
  $ databox dataset ingestion 12345 ing-456

  $ databox dataset ingestion 12345 ing-456 --json
```

_See code: [src/commands/dataset/ingestion.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingestion.ts)_

## `databox dataset ingestion-statistics DATASETID`

Get ingestion statistics for a dataset

```
USAGE
  $ databox dataset ingestion-statistics DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

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
  $ databox dataset ingestions DATASETID [--json] [--page <value>] [--page-size <value>]

ARGUMENTS
  DATASETID  The dataset ID to list ingestions for

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page

DESCRIPTION
  List ingestions for a dataset

EXAMPLES
  $ databox dataset ingestions 12345

  $ databox dataset ingestions 12345 --page 1 --page-size 20

  $ databox dataset ingestions 12345 --json
```

_See code: [src/commands/dataset/ingestions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/ingestions.ts)_

## `databox dataset list`

List datasets

```
USAGE
  $ databox dataset list [--json] [--data-source-id <value>] [--page <value>] [--page-size <value>] [--search
    <value>]

FLAGS
  --data-source-id=<value>  Filter by data source ID
  --json                    Output as JSON
  --page=<value>            Page number (0-indexed)
  --page-size=<value>       [default: 25] Number of items per page
  --search=<value>          Search by name

DESCRIPTION
  List datasets

EXAMPLES
  $ databox dataset list

  $ databox dataset list --search "revenue"

  $ databox dataset list --page 0 --page-size 10

  $ databox dataset list --json
```

_See code: [src/commands/dataset/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/list.ts)_

## `databox dataset metadata DATASETID`

Get metadata for a dataset

```
USAGE
  $ databox dataset metadata DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get metadata for a dataset

EXAMPLES
  $ databox dataset metadata 12345

  $ databox dataset metadata 12345 --json
```

_See code: [src/commands/dataset/metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/metadata.ts)_

## `databox dataset modifications DATASETID`

List modifications for a dataset

```
USAGE
  $ databox dataset modifications DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  List modifications for a dataset

EXAMPLES
  $ databox dataset modifications 12345

  $ databox dataset modifications 12345 --json
```

_See code: [src/commands/dataset/modifications.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/modifications.ts)_

## `databox dataset permissions DATASETID`

Get permissions for a dataset

```
USAGE
  $ databox dataset permissions DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get permissions for a dataset

EXAMPLES
  $ databox dataset permissions 12345

  $ databox dataset permissions 12345 --json
```

_See code: [src/commands/dataset/permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/permissions.ts)_

## `databox dataset purge DATASETID`

Purge all data from a dataset

```
USAGE
  $ databox dataset purge DATASETID [--json] [--force]

ARGUMENTS
  DATASETID  The dataset ID to purge data from

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

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
  $ databox dataset schema DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get the schema of a dataset

EXAMPLES
  $ databox dataset schema 12345

  $ databox dataset schema 12345 --json
```

_See code: [src/commands/dataset/schema.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/schema.ts)_

## `databox dataset set-column-metadata DATASETID`

Update column metadata for a dataset

```
USAGE
  $ databox dataset set-column-metadata DATASETID --columns <value> [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --columns=<value>  (required) JSON array of column metadata objects ({columnId, displayName?, description?})
  --json             Output as JSON

DESCRIPTION
  Update column metadata for a dataset

EXAMPLES
  $ databox dataset set-column-metadata 12345 --columns '[{"columnId":"revenue","displayName":"Revenue ($)"}]'
```

_See code: [src/commands/dataset/set-column-metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-column-metadata.ts)_

## `databox dataset set-metadata DATASETID`

Update metadata for a dataset

```
USAGE
  $ databox dataset set-metadata DATASETID [--json] [--description <value>] [--tags <value>]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --description=<value>  Dataset description
  --json                 Output as JSON
  --tags=<value>         JSON array of tags

DESCRIPTION
  Update metadata for a dataset

EXAMPLES
  $ databox dataset set-metadata 12345 --description "Revenue tracking"

  $ databox dataset set-metadata 12345 --tags '["finance","quarterly"]'
```

_See code: [src/commands/dataset/set-metadata.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-metadata.ts)_

## `databox dataset set-permissions DATASETID`

Set permissions for a dataset

```
USAGE
  $ databox dataset set-permissions DATASETID --access-level <value> [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --access-level=<value>  (required) Access level (e.g., everyone, specific_users)
  --json                  Output as JSON

DESCRIPTION
  Set permissions for a dataset

EXAMPLES
  $ databox dataset set-permissions 12345 --access-level everyone
```

_See code: [src/commands/dataset/set-permissions.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-permissions.ts)_

## `databox dataset set-sync-frequency DATASETID`

Set the sync frequency for a dataset

```
USAGE
  $ databox dataset set-sync-frequency DATASETID --interval <value> [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --interval=<value>  (required) Sync interval in minutes
  --json              Output as JSON

DESCRIPTION
  Set the sync frequency for a dataset

EXAMPLES
  $ databox dataset set-sync-frequency 12345 --interval 60
```

_See code: [src/commands/dataset/set-sync-frequency.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-sync-frequency.ts)_

## `databox dataset set-timezone DATASETID`

Set the timezone for a dataset

```
USAGE
  $ databox dataset set-timezone DATASETID --timezone <value> [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json              Output as JSON
  --timezone=<value>  (required) Timezone to set

DESCRIPTION
  Set the timezone for a dataset

EXAMPLES
  $ databox dataset set-timezone 12345 --timezone "US/Eastern"
```

_See code: [src/commands/dataset/set-timezone.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-timezone.ts)_

## `databox dataset set-verification DATASETID`

Set verification status for a dataset

```
USAGE
  $ databox dataset set-verification DATASETID --status verified|unverified [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json             Output as JSON
  --status=<option>  (required) Verification status
                     <options: verified|unverified>

DESCRIPTION
  Set verification status for a dataset

EXAMPLES
  $ databox dataset set-verification 12345 --status verified

  $ databox dataset set-verification 12345 --status unverified
```

_See code: [src/commands/dataset/set-verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/set-verification.ts)_

## `databox dataset sync-frequencies DATASETID`

List available sync frequencies for a dataset

```
USAGE
  $ databox dataset sync-frequencies DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  List available sync frequencies for a dataset

EXAMPLES
  $ databox dataset sync-frequencies 12345
```

_See code: [src/commands/dataset/sync-frequencies.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/sync-frequencies.ts)_

## `databox dataset sync-history DATASETID`

Show sync history for a dataset

```
USAGE
  $ databox dataset sync-history DATASETID [--json] [--page <value>] [--page-size <value>]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json               Output as JSON
  --page=<value>       Page number (0-indexed)
  --page-size=<value>  Number of items per page

DESCRIPTION
  Show sync history for a dataset

EXAMPLES
  $ databox dataset sync-history 12345

  $ databox dataset sync-history 12345 --page 0 --page-size 10
```

_See code: [src/commands/dataset/sync-history.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/sync-history.ts)_

## `databox dataset update DATASETID`

Update a dataset

```
USAGE
  $ databox dataset update DATASETID [--json] [--title <value>]

ARGUMENTS
  DATASETID  The dataset ID to update

FLAGS
  --json           Output as JSON
  --title=<value>  New title for the dataset

DESCRIPTION
  Update a dataset

EXAMPLES
  $ databox dataset update 12345 --title "New Title"
```

_See code: [src/commands/dataset/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/dataset/update.ts)_

## `databox dataset verification DATASETID`

Get verification status for a dataset

```
USAGE
  $ databox dataset verification DATASETID [--json]

ARGUMENTS
  DATASETID  The dataset ID

FLAGS
  --json  Output as JSON

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
  $ databox integration get INTEGRATIONID [--json]

ARGUMENTS
  INTEGRATIONID  The integration ID

FLAGS
  --json  Output as JSON

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
  $ databox integration list [--json] [--page <value>] [--page-size <value>] [--search <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page
  --search=<value>     Search by integration name

DESCRIPTION
  List available integrations

EXAMPLES
  $ databox integration list

  $ databox integration list --search google

  $ databox integration list --json
```

_See code: [src/commands/integration/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/integration/list.ts)_

## `databox metric create`

Create a custom metric

```
USAGE
  $ databox metric create --date <value> --dataset-id <value> --measure <value> --name <value> [--json]

FLAGS
  --dataset-id=<value>  (required) Dataset ID to create the metric on
  --date=<value>        (required) Date field reference as JSON ({"id":"...","name":"..."})
  --json                Output as JSON
  --measure=<value>     (required) Measure field reference as JSON ({"id":"...","name":"..."})
  --name=<value>        (required) Name of the metric

DESCRIPTION
  Create a custom metric

EXAMPLES
  $ databox metric create --name "Revenue" --dataset-id 123 --measure '{"id":"amount","name":"Amount"}' --date '{"id":"created_at","name":"Created At"}'

  $ databox metric create --name "Revenue" --dataset-id 123 --measure '{"id":"amount","name":"Amount"}' --date '{"id":"created_at","name":"Created At"}' --json
```

_See code: [src/commands/metric/create.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/create.ts)_

## `databox metric data`

Load metric data

```
USAGE
  $ databox metric data --date-from <value> --date-to <value> --granularity
    hourly|daily|weekly|monthly|quarterly|yearly|allTime --metric-id <value> [--json] [--data-source-id <value>]
    [--dataset-id <value>]

FLAGS
  --data-source-id=<value>  Data source ID (alternative to --dataset-id)
  --dataset-id=<value>      Dataset ID (alternative to --data-source-id)
  --date-from=<value>       (required) Start date (YYYY-MM-DD)
  --date-to=<value>         (required) End date (YYYY-MM-DD)
  --granularity=<option>    (required) Time granularity
                            <options: hourly|daily|weekly|monthly|quarterly|yearly|allTime>
  --json                    Output as JSON
  --metric-id=<value>       (required) Metric ID

DESCRIPTION
  Load metric data

EXAMPLES
  $ databox metric data --metric-id "500|custom_query_100" --date-from 2025-01-01 --date-to 2025-12-31 --granularity daily --dataset-id 123

  $ databox metric data --metric-id "GoogleAnalytics4@sessions" --date-from 2025-01-01 --date-to 2025-12-31 --granularity monthly --data-source-id 42 --json
```

_See code: [src/commands/metric/data.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/data.ts)_

## `databox metric delete METRICID`

Delete a metric

```
USAGE
  $ databox metric delete METRICID [--json] [--force]

ARGUMENTS
  METRICID  The metric ID to delete

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

DESCRIPTION
  Delete a metric

EXAMPLES
  $ databox metric delete "500|custom_query_100"

  $ databox metric delete "500|custom_query_100" --force
```

_See code: [src/commands/metric/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/delete.ts)_

## `databox metric dimension-values`

Get dimension values for a metric

```
USAGE
  $ databox metric dimension-values --dataset-id <value> --dimension <value> --metric-id <value> [--json]

FLAGS
  --dataset-id=<value>  (required) Dataset ID
  --dimension=<value>   (required) Dimension key
  --json                Output as JSON
  --metric-id=<value>   (required) Metric ID

DESCRIPTION
  Get dimension values for a metric

EXAMPLES
  $ databox metric dimension-values --metric-id "500|custom_query_100" --dimension country --dataset-id 123
```

_See code: [src/commands/metric/dimension-values.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/dimension-values.ts)_

## `databox metric drilldown`

Get drilldown data for a metric

```
USAGE
  $ databox metric drilldown --dataset-id <value> --end-timestamp <value> --metric-id <value> --start-timestamp
    <value> [--json]

FLAGS
  --dataset-id=<value>       (required) Dataset ID
  --end-timestamp=<value>    (required) End timestamp (Unix epoch)
  --json                     Output as JSON
  --metric-id=<value>        (required) Metric ID
  --start-timestamp=<value>  (required) Start timestamp (Unix epoch)

DESCRIPTION
  Get drilldown data for a metric

EXAMPLES
  $ databox metric drilldown --metric-id "500|custom_query_100" --dataset-id 123 --start-timestamp 1704067200 --end-timestamp 1706745600
```

_See code: [src/commands/metric/drilldown.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/drilldown.ts)_

## `databox metric get METRICID`

Get metric details

```
USAGE
  $ databox metric get METRICID [--json]

ARGUMENTS
  METRICID  The metric ID (e.g., "500|custom_query_100")

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get metric details

EXAMPLES
  $ databox metric get "500|custom_query_100"

  $ databox metric get "GoogleAnalytics4@sessions" --json
```

_See code: [src/commands/metric/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/get.ts)_

## `databox metric list`

List metrics

```
USAGE
  $ databox metric list [--json] [--data-source-id <value>] [--page <value>] [--page-size <value>] [--search
    <value>]

FLAGS
  --data-source-id=<value>  Filter by data source ID
  --json                    Output as JSON
  --page=<value>            Page number
  --page-size=<value>       Number of items per page
  --search=<value>          Search by metric name

DESCRIPTION
  List metrics

EXAMPLES
  $ databox metric list

  $ databox metric list --data-source-id 42

  $ databox metric list --search revenue

  $ databox metric list --json
```

_See code: [src/commands/metric/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/list.ts)_

## `databox metric set-verification METRICID`

Set metric verification status

```
USAGE
  $ databox metric set-verification METRICID --status verified|unverified [--json]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json             Output as JSON
  --status=<option>  (required) Verification status
                     <options: verified|unverified>

DESCRIPTION
  Set metric verification status

EXAMPLES
  $ databox metric set-verification "500|custom_query_100" --status verified

  $ databox metric set-verification "500|custom_query_100" --status unverified
```

_See code: [src/commands/metric/set-verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/set-verification.ts)_

## `databox metric update METRICID`

Update a metric

```
USAGE
  $ databox metric update METRICID [--json] [--name <value>]

ARGUMENTS
  METRICID  The metric ID to update

FLAGS
  --json          Output as JSON
  --name=<value>  New name for the metric

DESCRIPTION
  Update a metric

EXAMPLES
  $ databox metric update "500|custom_query_100" --name "New Name"
```

_See code: [src/commands/metric/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/update.ts)_

## `databox metric usages METRICID`

Get where a metric is used

```
USAGE
  $ databox metric usages METRICID [--json]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get where a metric is used

EXAMPLES
  $ databox metric usages "500|custom_query_100"

  $ databox metric usages "500|custom_query_100" --json
```

_See code: [src/commands/metric/usages.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/usages.ts)_

## `databox metric verification METRICID`

Get metric verification status

```
USAGE
  $ databox metric verification METRICID [--json]

ARGUMENTS
  METRICID  The metric ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get metric verification status

EXAMPLES
  $ databox metric verification "500|custom_query_100"

  $ databox metric verification "500|custom_query_100" --json
```

_See code: [src/commands/metric/verification.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/metric/verification.ts)_

## `databox profile info`

Show your profile

```
USAGE
  $ databox profile info [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  Show your profile

EXAMPLES
  $ databox profile info

  $ databox profile info --json
```

_See code: [src/commands/profile/info.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/profile/info.ts)_

## `databox profile update`

Update your profile

```
USAGE
  $ databox profile update [--json] [--name <value>] [--timezone <value>]

FLAGS
  --json              Output as JSON
  --name=<value>      New display name
  --timezone=<value>  New timezone

DESCRIPTION
  Update your profile

EXAMPLES
  $ databox profile update --name "New Name"

  $ databox profile update --timezone "US/Eastern"

  $ databox profile update --name "New Name" --timezone "UTC" --json
```

_See code: [src/commands/profile/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/profile/update.ts)_

## `databox user delete USERID`

Remove a user from the account

```
USAGE
  $ databox user delete USERID [--json] [--force]

ARGUMENTS
  USERID  The user ID to remove

FLAGS
  --force  Skip confirmation prompt
  --json   Output as JSON

DESCRIPTION
  Remove a user from the account

EXAMPLES
  $ databox user delete 12345

  $ databox user delete 12345 --force
```

_See code: [src/commands/user/delete.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/delete.ts)_

## `databox user get USERID`

Get user details

```
USAGE
  $ databox user get USERID [--json]

ARGUMENTS
  USERID  The user ID

FLAGS
  --json  Output as JSON

DESCRIPTION
  Get user details

EXAMPLES
  $ databox user get 12345

  $ databox user get 12345 --json
```

_See code: [src/commands/user/get.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/get.ts)_

## `databox user invite`

Invite a user to the account

```
USAGE
  $ databox user invite --email <value> --role admin|user [--json]

FLAGS
  --email=<value>  (required) Email address of the user to invite
  --json           Output as JSON
  --role=<option>  (required) Role for the new user
                   <options: admin|user>

DESCRIPTION
  Invite a user to the account

EXAMPLES
  $ databox user invite --email user@example.com --role user

  $ databox user invite --email admin@example.com --role admin --json
```

_See code: [src/commands/user/invite.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/invite.ts)_

## `databox user list`

List users in the account

```
USAGE
  $ databox user list [--json] [--page <value>] [--page-size <value>]

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page

DESCRIPTION
  List users in the account

EXAMPLES
  $ databox user list

  $ databox user list --json
```

_See code: [src/commands/user/list.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/list.ts)_

## `databox user update USERID`

Update a user's role

```
USAGE
  $ databox user update USERID --role admin|user [--json]

ARGUMENTS
  USERID  The user ID to update

FLAGS
  --json           Output as JSON
  --role=<option>  (required) New role for the user
                   <options: admin|user>

DESCRIPTION
  Update a user's role

EXAMPLES
  $ databox user update 12345 --role admin

  $ databox user update 12345 --role user --json
```

_See code: [src/commands/user/update.ts](https://github.com/databox/databox-cli/blob/v1.0.0/src/commands/user/update.ts)_
<!-- commandsstop -->
