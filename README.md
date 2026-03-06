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
