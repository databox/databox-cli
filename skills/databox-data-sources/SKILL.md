---
name: databox-data-sources
description: Use when the user wants to create, delete, or manage Databox data sources, or list datasets linked to a data source. Triggers on mentions of data source creation, deletion, or data source management in Databox.
---

# Databox Data Source Management

Create, delete, and inspect data sources via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| Create data source | `databox data-source create --title "Name"` |
| Create with options | `databox data-source create --title "Name" --timezone "US/Eastern" --key my_key --account-id 123` |
| Delete data source | `databox data-source delete ID --force` |
| List linked datasets | `databox data-source datasets ID` |

## Create Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Name of the data source |
| `--account-id` | No | Account to create in |
| `--timezone` | No | Timezone (run `databox account timezones` for options) |
| `--key` | No | Unique identifier key |

## Common Workflow: Set Up a New Data Source

```bash
# 1. Create the data source
databox data-source create --title "My API Data" --timezone "UTC"

# 2. Note the returned ID, then create a dataset for it
databox dataset create --title "Daily Metrics" --data-source-id ID
```

## Destructive Operations

`data-source delete` prompts for confirmation. Use `--force` to skip when scripting.

## Notes

- All commands support `--json` for machine-readable output
- Data source IDs are numeric (e.g. `42`)
- Deleting a data source may affect linked datasets
