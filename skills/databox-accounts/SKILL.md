---
name: databox-accounts
description: Use when the user wants to manage the accounts in their Databox organization — list, create, update, or delete accounts, or work inside one of them. Triggers on mentions of accounts in an organization, agency management, or multi-account management in Databox.
---

# Databox Account Management

Manage the accounts in your organization via the `databox` CLI.

## Prerequisites

Must be authenticated with an organization that manages accounts (an agency). If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List accounts | `databox account list` |
| Get account detail | `databox account get ACCOUNT_ID` |
| Create account | `databox account create --name "Account Name"` |
| Update account | `databox account update ACCOUNT_ID --name "New Name"` |
| Delete account | `databox account delete ACCOUNT_ID --force` |

## Working Inside an Account

Use `--account-id` on any command to scope it to an account:

```bash
databox data-source list --account-id ACCOUNT_ID
databox dataset list --account-id ACCOUNT_ID
```

## Notes

- All commands support `--json` for machine-readable output
- Account management is only available to an organization that manages accounts
- `databox profile info` shows your own organization, and your home account if you belong to one
