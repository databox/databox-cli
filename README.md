# databox-cli

CLI for the [Databox](https://databox.com) public API. Manage accounts, data sources, datasets, and push data — all from the terminal.

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

# List your accounts
databox account list

# Push data into a dataset
databox dataset ingest DATASET_ID --file data.json
```

## Authentication

All commands (except `auth login`) require an API key. Run `databox auth login` to store your key in `~/.config/databox-cli/config.json`.

You can also pass the key inline:

```bash
databox auth login --api-key YOUR_API_KEY
```

## Output Formats

By default, commands output human-readable tables. Add `--json` to any command for machine-readable JSON output:

```bash
databox account list --json
```

## Agent Skills

This package includes shareable skills for AI agents (like [Claude Code](https://claude.ai/claude-code)) to use the CLI autonomously.

### Bundled Skills

| Skill | Description |
|-------|-------------|
| `databox-auth` | Authentication setup and API key validation |
| `databox-accounts` | Account discovery, timezones, resource listing |
| `databox-data-sources` | Data source create, delete, and inspection |
| `databox-datasets` | Dataset CRUD, schema definition, data ingestion, monitoring |

### Setup for Claude Code

Add the skills to your project's `.claude/settings.json`:

```json
{
  "skills": ["node_modules/databox-cli/skills/*"]
}
```

Or copy them globally:

```bash
cp -r $(npm root -g)/databox-cli/skills/* ~/.claude/skills/
```

Once installed, Claude Code can manage your Databox resources directly — creating data sources, defining schemas, pushing data, and monitoring ingestions.

## Commands

<!-- commands -->
* [`databox account data-sources ACCOUNTID`](#databox-account-data-sources-accountid)
* [`databox account datasets ACCOUNTID`](#databox-account-datasets-accountid)
* [`databox account list`](#databox-account-list)
* [`databox account timezones`](#databox-account-timezones)
* [`databox auth login`](#databox-auth-login)
* [`databox auth validate`](#databox-auth-validate)
* [`databox data-source create`](#databox-data-source-create)
* [`databox data-source datasets DATASOURCEID`](#databox-data-source-datasets-datasourceid)
* [`databox data-source delete DATASOURCEID`](#databox-data-source-delete-datasourceid)
* [`databox dataset create`](#databox-dataset-create)
* [`databox dataset delete DATASETID`](#databox-dataset-delete-datasetid)
* [`databox dataset get DATASETID`](#databox-dataset-get-datasetid)
* [`databox dataset ingest DATASETID`](#databox-dataset-ingest-datasetid)
* [`databox dataset ingestion DATASETID INGESTIONID`](#databox-dataset-ingestion-datasetid-ingestionid)
* [`databox dataset ingestions DATASETID`](#databox-dataset-ingestions-datasetid)
* [`databox dataset purge DATASETID`](#databox-dataset-purge-datasetid)
* [`databox help [COMMAND]`](#databox-help-command)

## `databox account data-sources ACCOUNTID`

List data sources for a specific account

```
USAGE
  $ databox account data-sources ACCOUNTID [--json]

ARGUMENTS
  ACCOUNTID  The account ID to list data sources for

FLAGS
  --json  Output as JSON

DESCRIPTION
  List data sources for a specific account

EXAMPLES
  $ databox account data-sources 12345

  $ databox account data-sources 12345 --json
```

_See code: [src/commands/account/data-sources.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/account/data-sources.ts)_

## `databox account datasets ACCOUNTID`

List datasets for a specific account

```
USAGE
  $ databox account datasets ACCOUNTID [--json] [--page <value>] [--page-size <value>] [--type
    datasets|merged_datasets]

ARGUMENTS
  ACCOUNTID  The account ID to list datasets for

FLAGS
  --json               Output as JSON
  --page=<value>       Page number
  --page-size=<value>  Number of items per page
  --type=<option>      Filter by dataset type
                       <options: datasets|merged_datasets>

DESCRIPTION
  List datasets for a specific account

EXAMPLES
  $ databox account datasets 12345

  $ databox account datasets 12345 --type datasets

  $ databox account datasets 12345 --page 1 --page-size 20

  $ databox account datasets 12345 --json
```

_See code: [src/commands/account/datasets.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/account/datasets.ts)_

## `databox account list`

List all accounts you have access to

```
USAGE
  $ databox account list [--json]

FLAGS
  --json  Output as JSON

DESCRIPTION
  List all accounts you have access to

EXAMPLES
  $ databox account list

  $ databox account list --json
```

_See code: [src/commands/account/list.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/account/list.ts)_

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

_See code: [src/commands/account/timezones.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/account/timezones.ts)_

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

_See code: [src/commands/auth/login.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/auth/login.ts)_

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

_See code: [src/commands/auth/validate.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/auth/validate.ts)_

## `databox data-source create`

Create a new data source

```
USAGE
  $ databox data-source create --title <value> [--json] [--account-id <value>] [--key <value>] [--timezone <value>]

FLAGS
  --account-id=<value>  Account ID to create the data source in
  --json                Output as JSON
  --key=<value>         Unique key for the data source
  --timezone=<value>    Timezone for the data source
  --title=<value>       (required) Title of the data source

DESCRIPTION
  Create a new data source

EXAMPLES
  $ databox data-source create --title "My Data Source"

  $ databox data-source create --title "My Data Source" --timezone "US/Eastern"

  $ databox data-source create --title "My Data Source" --account-id 12345 --key my_source --json
```

_See code: [src/commands/data-source/create.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/data-source/create.ts)_

## `databox data-source datasets DATASOURCEID`

List datasets for a data source

```
USAGE
  $ databox data-source datasets DATASOURCEID [--json]

ARGUMENTS
  DATASOURCEID  ID of the data source

FLAGS
  --json  Output as JSON

DESCRIPTION
  List datasets for a data source

EXAMPLES
  $ databox data-source datasets 12345

  $ databox data-source datasets 12345 --json
```

_See code: [src/commands/data-source/datasets.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/data-source/datasets.ts)_

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

_See code: [src/commands/data-source/delete.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/data-source/delete.ts)_

## `databox dataset create`

Create a new dataset

```
USAGE
  $ databox dataset create --data-source-id <value> --title <value> [--json] [--primary-keys <value>...] [--schema
    <value>]

FLAGS
  --data-source-id=<value>   (required) ID of the data source to associate with
  --json                     Output as JSON
  --primary-keys=<value>...  Primary key column names
  --schema=<value>           JSON string of schema columns (array of {name, dataType})
  --title=<value>            (required) Title of the dataset

DESCRIPTION
  Create a new dataset

EXAMPLES
  $ databox dataset create --title "My Dataset" --data-source-id 123

  $ databox dataset create --title "My Dataset" --data-source-id 123 --primary-keys date --primary-keys campaign

  $ databox dataset create --title "My Dataset" --data-source-id 123 --schema '[{"name":"date","dataType":"datetime"},{"name":"value","dataType":"number"}]'

  $ databox dataset create --title "My Dataset" --data-source-id 123 --json
```

_See code: [src/commands/dataset/create.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/create.ts)_

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
  $ databox dataset delete abc-123

  $ databox dataset delete abc-123 --force
```

_See code: [src/commands/dataset/delete.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/delete.ts)_

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
  $ databox dataset get abc-123

  $ databox dataset get abc-123 --json
```

_See code: [src/commands/dataset/get.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/get.ts)_

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
  $ databox dataset ingest abc-123 --records '[{"date":"2024-01-01","value":42}]'

  $ databox dataset ingest abc-123 --file ./data.json

  cat data.json | databox dataset ingest abc-123

  $ databox dataset ingest abc-123 --records '[{"date":"2024-01-01","value":42}]' --json
```

_See code: [src/commands/dataset/ingest.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/ingest.ts)_

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
  $ databox dataset ingestion abc-123 ing-456

  $ databox dataset ingestion abc-123 ing-456 --json
```

_See code: [src/commands/dataset/ingestion.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/ingestion.ts)_

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
  $ databox dataset ingestions abc-123

  $ databox dataset ingestions abc-123 --page 1 --page-size 20

  $ databox dataset ingestions abc-123 --json
```

_See code: [src/commands/dataset/ingestions.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/ingestions.ts)_

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
  $ databox dataset purge abc-123

  $ databox dataset purge abc-123 --force
```

_See code: [src/commands/dataset/purge.ts](https://github.com/databox/databox-cli/blob/v0.2.0/src/commands/dataset/purge.ts)_

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
<!-- commandsstop -->
