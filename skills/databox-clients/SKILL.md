---
name: databox-clients
description: Use when the user wants to manage client accounts in Databox (agency model) — create, update, or delete client accounts. Triggers on mentions of client accounts, agency management, or multi-account management in Databox.
---

# Databox Client Account Management

Manage client accounts for agency setups via the `databox` CLI.

## Prerequisites

Must be authenticated with an agency account. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List clients | `databox client list` |
| Get client detail | `databox client get CLIENT_ID` |
| Create client | `databox client create --name "Client Name"` |
| Update client | `databox client update CLIENT_ID --name "New Name"` |
| Delete client | `databox client delete CLIENT_ID --force` |

## Accessing Client Resources

Use `--account-id` on any command to scope it to a client account:

```bash
databox data-source list --account-id CLIENT_ID
databox dataset list --account-id CLIENT_ID
```

## Notes

- All commands support `--json` for machine-readable output
- Client management is only available for agency accounts
