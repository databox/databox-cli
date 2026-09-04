---
name: databox-data-sources
description: Use when the user wants to create, manage, or inspect Databox data sources — including timezone, sync frequency, permissions, and purging. Triggers on mentions of data source creation, deletion, configuration, or management in Databox.
---

# Databox Data Source Management

Full data source lifecycle — list, create, configure, and delete — via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List data sources | `databox data-source list` |
| Search data sources | `databox data-source list --search "analytics"` |
| Get data source details | `databox data-source get ID` |
| Create data source | `databox data-source create --title "Name"` |
| Create with key | `databox data-source create --title "Name" --key Datadoo` |
| Update title | `databox data-source update ID --title "New Name"` |
| Set timezone | `databox data-source set-timezone ID --timezone "US/Eastern"` |
| View sync frequencies | `databox data-source sync-frequencies ID` |
| Set sync frequency | `databox data-source set-sync-frequency ID --interval 60` |
| View permissions | `databox data-source permissions ID` |
| Set permissions | `databox data-source set-permissions ID --access-level everyone` |
| List linked datasets | `databox data-source datasets ID` |
| Purge all data | `databox data-source purge ID --force` |
| Delete data source | `databox data-source delete ID --force` |

## Common Workflow: Set Up a New Data Source

```bash
# 1. Create a data source
databox data-source create --title "My API Data" --timezone "UTC" --json
# Returns: {"id": 42, ...}

# 2. Create a dataset under it
databox dataset create --title "Daily Metrics" --data-source-id 42

# 3. Push data
databox dataset ingest 67890 --file data.json
```

## Destructive Operations

These commands prompt for confirmation. Use `--force` to skip when scripting:
- `data-source delete` — removes the data source entirely
- `data-source purge` — removes all data but keeps the data source

## Notes

- All commands support `--json` for machine-readable output
- Data source IDs are numeric (e.g., `42`)
- The `--key` flag on create sets the integration key for third-party integrations (e.g., Datadoo)
