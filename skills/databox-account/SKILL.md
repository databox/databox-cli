---
name: databox-account
description: Use when the user wants to view their Databox account info, check usage, update account settings, list timezones, or explore account resources. Triggers on mentions of Databox account details, settings, usage stats, or timezones.
---

# Databox Account Management

View account details, usage, and settings via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| View account info | `databox account info` |
| View account (JSON) | `databox account info --json` |
| Update account name | `databox account update --name "New Name"` |
| View usage stats | `databox account usage` |
| List timezones | `databox account timezones` |
| List data sources | `databox data-source list` |
| List datasets | `databox dataset list` |

## Common Workflow: Discover Resources

```bash
# 1. View your account
databox account info

# 2. List data sources
databox data-source list

# 3. List datasets
databox dataset list

# 4. For a specific client account (agency model)
databox data-source list --account-id 12345
```

## Multi-Account Access

For agency accounts managing clients, use `--account-id` on any command to scope it to a specific client account. Use `databox client list` to see your client accounts.

## Notes

- All commands support `--json` for machine-readable output
- Account IDs and data source IDs are numeric (e.g., `12345`)
- Dataset IDs are numeric (e.g., `67890`)
