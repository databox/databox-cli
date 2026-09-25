---
name: databox-organization
description: Use when the user wants to view their Databox organization info, check usage, update organization settings, list timezones, or explore the organization's resources. Triggers on mentions of Databox organization details, settings, usage stats, or timezones.
---

# Databox Organization Management

View organization details, usage, and settings via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| View organization info | `databox organization info` |
| View organization (JSON) | `databox organization info --json` |
| Update organization name | `databox organization update --name "New Name"` |
| View usage stats | `databox organization usage` |
| List timezones | `databox organization timezones` |
| List data sources | `databox data-source list` |
| List datasets | `databox dataset list` |

## Common Workflow: Discover Resources

```bash
# 1. View your organization
databox organization info

# 2. List data sources
databox data-source list

# 3. List datasets
databox dataset list

# 4. For a specific account in your organization
databox data-source list --account-id 12345
```

## Accounts in Your Organization

An organization that manages accounts can scope any command to one of them with `--account-id`. Use `databox account list` to see the accounts, and the `databox-accounts` skill to manage them. With `--account-id`, `organization info` and the other `organization` commands answer for that account.

## Notes

- All commands support `--json` for machine-readable output
- Organization, account and data source IDs are numeric (e.g., `12345`)
- Dataset IDs are numeric (e.g., `67890`)
