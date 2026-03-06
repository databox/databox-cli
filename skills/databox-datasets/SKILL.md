---
name: databox-datasets
description: Use when the user wants to create datasets, push or ingest data into Databox, check ingestion status, delete or purge datasets, or define dataset schemas. Triggers on mentions of data ingestion, pushing data, dataset creation, dataset schema, ingestion monitoring, or data pipeline setup in Databox.
---

# Databox Dataset Management & Data Ingestion

Full dataset lifecycle — create, ingest data, monitor, purge, delete — via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| Create dataset | `databox dataset create --title "Name" --data-source-id ID` |
| Get dataset details | `databox dataset get DATASET_ID` |
| Delete dataset | `databox dataset delete DATASET_ID --force` |
| Purge dataset data | `databox dataset purge DATASET_ID --force` |
| Ingest inline | `databox dataset ingest DATASET_ID --records '[...]'` |
| Ingest from file | `databox dataset ingest DATASET_ID --file data.json` |
| Ingest from stdin | `cat data.json \| databox dataset ingest DATASET_ID` |
| List ingestions | `databox dataset ingestions DATASET_ID` |
| Get ingestion detail | `databox dataset ingestion DATASET_ID INGESTION_ID` |

## Create Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Dataset name |
| `--data-source-id` | Yes | Parent data source ID |
| `--primary-keys` | No | Primary key columns (repeatable) |
| `--schema` | No | JSON schema definition |

## Schema Definition

Pass schema as JSON string with `--schema`:

```bash
databox dataset create \
  --title "Web Analytics" \
  --data-source-id 42 \
  --primary-keys date \
  --primary-keys page \
  --schema '[{"name":"date","dataType":"datetime"},{"name":"page","dataType":"string"},{"name":"views","dataType":"number"}]'
```

Valid `dataType` values: `string`, `number`, `datetime`

## Data Ingestion

Three input methods — use exactly one:

**Inline JSON:**
```bash
databox dataset ingest abc-123 --records '[{"date":"2024-01-01","views":100},{"date":"2024-01-02","views":150}]'
```

**From file:**
```bash
databox dataset ingest abc-123 --file ./metrics.json
```

The file must contain a JSON array of record objects.

**From stdin (pipe):**
```bash
cat metrics.json | databox dataset ingest abc-123
```

## Common Workflow: Full Data Pipeline

```bash
# 1. Create a data source
databox data-source create --title "My App" --json
# Returns: {"id": 42, ...}

# 2. Create a dataset with schema
databox dataset create \
  --title "Daily Metrics" \
  --data-source-id 42 \
  --primary-keys date \
  --schema '[{"name":"date","dataType":"datetime"},{"name":"users","dataType":"number"}]' \
  --json
# Returns: {"id": "ds-abc-123", ...}

# 3. Push data
databox dataset ingest ds-abc-123 --file ./data.json --json
# Returns: {"ingestionId": "ing-456", "status": "accepted", ...}

# 4. Check ingestion status
databox dataset ingestion ds-abc-123 ing-456
```

## Monitoring Ingestions

```bash
# List all ingestions for a dataset
databox dataset ingestions DATASET_ID

# Paginate results
databox dataset ingestions DATASET_ID --page 1 --page-size 50

# Get details of a specific ingestion (includes errors if any)
databox dataset ingestion DATASET_ID INGESTION_ID --json
```

## Destructive Operations

These commands prompt for confirmation. Use `--force` to skip:
- `dataset delete` — removes the dataset entirely
- `dataset purge` — removes all data but keeps the dataset

## Notes

- All commands support `--json` for machine-readable output
- Dataset IDs are UUIDs (e.g. `a1b2c3d4-...`)
- Ingestion IDs are UUIDs returned by the `ingest` command
