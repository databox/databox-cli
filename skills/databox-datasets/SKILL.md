---
name: databox-datasets
description: Use when the user wants to create datasets, push or ingest data into Databox, check ingestion status, manage dataset schema/metadata/verification, or perform dataset operations. Triggers on mentions of data ingestion, pushing data, dataset creation, schema, metadata, or data pipeline setup in Databox.
---

# Databox Dataset Management & Data Ingestion

Full dataset lifecycle — create, ingest data, monitor, configure, and delete — via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List datasets | `databox dataset list` |
| Create dataset | `databox dataset create --title "Name" --data-source-id ID` |
| Get dataset details | `databox dataset get ID` |
| View schema | `databox dataset schema ID` |
| View data | `databox dataset data ID` |
| Ingest inline | `databox dataset ingest ID --records '[...]'` |
| Ingest from file | `databox dataset ingest ID --file data.json` |
| Ingest from stdin | `cat data.json \| databox dataset ingest ID` |
| List ingestions | `databox dataset ingestions ID` |
| Get ingestion detail | `databox dataset ingestion ID INGESTION_ID` |
| Ingestion stats | `databox dataset ingestion-statistics ID` |
| Duplicate dataset | `databox dataset duplicate ID` |
| Update title | `databox dataset update ID --title "New Name"` |
| Set timezone | `databox dataset set-timezone ID --timezone "US/Eastern"` |
| View/set permissions | `databox dataset permissions ID` |
| View/set metadata | `databox dataset metadata ID` |
| View verification | `databox dataset verification ID` |
| Purge data | `databox dataset purge ID --force` |
| Delete dataset | `databox dataset delete ID --force` |

## Create Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Dataset name |
| `--data-source-id` | Yes | Parent data source ID |
| `--primary-key` | No | Primary key columns (repeatable) |
| `--schema` | No | JSON schema definition |

## Schema Definition

Pass schema as JSON string with `--schema`:

```bash
databox dataset create \
  --title "Web Analytics" \
  --data-source-id 42 \
  --primary-key date \
  --primary-key page \
  --schema '[{"columnId":"date","dataType":"datetime"},{"columnId":"page","dataType":"string"},{"columnId":"views","dataType":"number"}]'
```

Valid `dataType` values: `string`, `number`, `datetime`

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

## Common Workflow: Full Data Pipeline

```bash
# 1. Create a data source
databox data-source create --title "My App" --json
# Returns: {"id": 42, ...}

# 2. Create a dataset with schema
databox dataset create \
  --title "Daily Metrics" \
  --data-source-id 42 \
  --primary-key date \
  --schema '[{"columnId":"date","dataType":"datetime"},{"columnId":"users","dataType":"number"}]' \
  --json
# Returns: {"id": 67890, ...}

# 3. Push data
databox dataset ingest 67890 --file ./data.json --json
# Returns: {"ingestionId": "ing-456", "status": "accepted", ...}

# 4. Check ingestion status
databox dataset ingestion 67890 ing-456
```

## Destructive Operations

These commands prompt for confirmation. Use `--force` to skip:
- `dataset delete` — removes the dataset entirely
- `dataset purge` — removes all data but keeps the dataset
- `dataset clear-modifications` — clears all modifications

## Notes

- All commands support `--json` for machine-readable output
- Dataset IDs are numeric (e.g., `67890`)
- Ingestion IDs are strings returned by the `ingest` command
