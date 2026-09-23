---
name: databox-datasets
description: Use when the user wants to create datasets, push or ingest data into Databox, check ingestion status, manage dataset schema/metadata/verification/modifications, or perform dataset operations. Triggers on mentions of data ingestion, pushing data, dataset creation, schema, metadata, modifications, lineage, or data pipeline setup in Databox.
---

# Databox Dataset Management & Data Ingestion

Full dataset lifecycle — create, ingest data, monitor, configure, and delete — via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List datasets | `databox dataset list` |
| List a data source's datasets | `databox dataset list --data-source-id ID` |
| Create dataset | `databox dataset create --name "Name" --data-source-id ID` |
| Get dataset details | `databox dataset get ID` |
| View schema and primary key | `databox dataset schema ID` |
| View data | `databox dataset data ID` |
| View data, sorted | `databox dataset data ID --sort-by COLUMN_ID --sort-order desc` |
| Export all rows as CSV | `databox dataset data ID --all --output csv > rows.csv` |
| Ingest inline | `databox dataset ingest ID --records '[...]'` |
| Ingest from file | `databox dataset ingest ID --file data.json` |
| Ingest from stdin | `cat data.json \| databox dataset ingest ID` |
| List ingestions | `databox dataset ingestions ID` |
| Get ingestion detail | `databox dataset ingestion ID INGESTION_ID` |
| Ingestion stats | `databox dataset ingestion-statistics ID` |
| Duplicate dataset | `databox dataset duplicate ID` |
| Update name | `databox dataset update ID --name "New Name"` |
| Set timezone | `databox dataset set-timezone ID --timezone "US/Eastern"` |
| Sync frequency options | `databox dataset sync-frequency-options ID` |
| Set sync frequency | `databox dataset set-sync-frequency ID --interval 60` |
| Sync history / statistics | `databox dataset sync-history ID` / `databox dataset sync-statistics ID` |
| View permissions | `databox dataset permissions ID` |
| Set permissions | `databox dataset set-permissions ID --access-level everyone` |
| View metadata | `databox dataset metadata ID` |
| Set metadata | `databox dataset set-metadata ID --description "..." --default-time-dimension COLUMN_ID` |
| View column metadata | `databox dataset column-metadata ID` |
| Set column metadata | `databox dataset set-column-metadata ID --columns '[{"id":"amount","conceptType":"measure"}]'` |
| View verification | `databox dataset verification ID` |
| Set verification | `databox dataset set-verification ID --status verified` |
| View lineage | `databox dataset lineage ID` |
| View modifications | `databox dataset modifications ID` |
| Preview a modification | `databox dataset preview-modification ID --data '{...}'` |
| Save a modification | `databox dataset update-modification ID --data '{...}'` |
| Clear modifications | `databox dataset clear-modifications ID --force` |
| Filter operators and type conversions | `databox dataset modification-rules` |
| Formula functions | `databox dataset modification-functions` |
| Purge data | `databox dataset purge ID --force` |
| Delete dataset | `databox dataset delete ID --force` |

## Create Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Dataset name |
| `--data-source-id` | Yes | Parent data source ID |
| `--primary-key` | No | Primary key column id (repeat for several) |
| `--schema` | No | JSON array of columns, each `{"id", "dataType"}` |
| `--idempotency-key` | No | UUID; a retry with the same key within 24 hours does not create a second dataset |

## Schema Definition

Pass the schema as a JSON array with `--schema`. Each column is `{"id", "dataType"}`:

```bash
databox dataset create \
  --name "Web Analytics" \
  --data-source-id 42 \
  --primary-key date \
  --primary-key page \
  --schema '[{"id":"date","dataType":"datetime"},{"id":"page","dataType":"string"},{"id":"views","dataType":"number"}]'
```

Valid `dataType` values: `string`, `number`, `datetime`. The column `id` is what every other command uses to refer to the column: `--primary-key`, `--sort-by`, column metadata, modifications, and metric column references.

## Data Ingestion

Three input methods — use exactly one:

**Inline JSON:**
```bash
databox dataset ingest 67890 --records '[{"date":"2024-01-01","views":100}]'
```

**From file:**
```bash
databox dataset ingest 67890 --file ./metrics.json
```

**From stdin (pipe):**
```bash
cat metrics.json | databox dataset ingest 67890
```

Pass `--idempotency-key "$(uuidgen)"` when a retry must not ingest the same rows twice; re-run with the same key.

## Common Workflow: Full Data Pipeline

```bash
# 1. Create a data source
databox data-source create --name "My App" --json
# Returns: {"id": 42, ...}

# 2. Create a dataset with schema
databox dataset create \
  --name "Daily Metrics" \
  --data-source-id 42 \
  --primary-key date \
  --schema '[{"id":"date","dataType":"datetime"},{"id":"users","dataType":"number"}]' \
  --json
# Returns: {"id": 67890, ...}

# 3. Push data
databox dataset ingest 67890 --file ./data.json --json
# Returns: {"ingestionId": "3c63e510-276f-4541-9c66-8c00161fda82", "status": "...", "message": "..."}

# 4. Check ingestion status, with row counts and any record errors
databox dataset ingestion 67890 3c63e510-276f-4541-9c66-8c00161fda82 --json
```

## Modifications

A dataset's modification is one definition with these keys, all keyed by column `id`:

- `filters` — per column, `{"logicalOperator": "AND", "conditions": [{"type": "greater_than", "value": 100}]}`
- `formulas` — computed columns, `{"totalWithTax": "$amount * 1.2"}`
- `displayNames` — column renames, `{"amount": "Revenue"}`
- `dataTypes` — per column, `{"outputLogicalType": "currency"}` plus optional `inputFormat` and `outputFormat`
- `order` — column ids in display order
- `visibility` — `{"orderId": false}` hides a column

`dataset update-modification` **replaces the whole definition**: a key left out of `--data` is cleared. To change one part, read the current definition, edit it, and send it back:

```bash
databox dataset modifications 67890 --json > mod.json
# edit mod.json
databox dataset preview-modification 67890 --data "$(cat mod.json)"   # up to 200 rows, not saved
databox dataset update-modification 67890 --data "$(cat mod.json)"
```

`dataset modification-rules` lists the filter operators (`type`) and type conversions (`outputLogicalType`) each column type accepts; `dataset modification-functions` lists the functions formulas can use.

## Permissions

`--access-level` is `everyone`, `selectedUsers` or `private`. `--access-list USER_ID` (repeatable) is only accepted with `selectedUsers`. Admins and the account owner always keep access.

## Destructive Operations

These commands prompt for confirmation. Use `--force` to skip:
- `dataset delete` — removes the dataset entirely
- `dataset purge` — removes all data but keeps the dataset
- `dataset clear-modifications` — clears all modifications

## Notes

- All commands support `--json` and `--output csv` for machine-readable output
- `dataset schema`, `dataset data` and `dataset preview-modification` return the whole response under `--json` (rows or columns under `items`, plus `schema`/`primaryKey`)
- Dataset IDs are numeric (e.g., `67890`)
- Ingestion IDs are UUIDs returned by the `ingest` command
- `--interval` on `set-sync-frequency` is in minutes: 1, 15, 60, 240, 360, 480 or 1440; `sync-frequency-options` shows which your plan includes
