---
name: databox-accounts
description: Use when the user wants to list Databox accounts, view supported timezones, list data sources or datasets for an account, or explore what resources they have in Databox. Triggers on mentions of Databox accounts, timezones, or listing account resources.
---

# Databox Account Management

Query accounts and their resources via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List accounts | `databox account list` |
| List accounts (JSON) | `databox account list --json` |
| List timezones | `databox account timezones` |
| List data sources | `databox account data-sources ACCOUNT_ID` |
| List datasets | `databox account datasets ACCOUNT_ID` |
| Filter datasets | `databox account datasets ACCOUNT_ID --type datasets` |
| Paginate datasets | `databox account datasets ACCOUNT_ID --page 1 --page-size 20` |

## Common Workflow: Discover Resources

```bash
# 1. Find the account ID
databox account list

# 2. List its data sources
databox account data-sources 12345

# 3. List its datasets
databox account datasets 12345
```

## Dataset Type Filter

The `--type` flag accepts:
- `datasets` — regular datasets
- `merged_datasets` — merged/combined datasets

## Notes

- All commands support `--json` for machine-readable output
- Account IDs are numeric (e.g. `12345`)
- Dataset IDs are UUIDs (e.g. `a1b2c3d4-...`)
