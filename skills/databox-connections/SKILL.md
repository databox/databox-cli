---
name: databox-connections
description: Use when the user wants to view or manage connections in Databox — list, update, delete connections, or manage connection permissions. Triggers on mentions of connections, OAuth connections, or connection permissions in Databox.
---

# Databox Connection Management

View and manage connections via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Visibility

Connections follow the app's sharing rules:

- `connection list` shows an admin every connection, and anyone else only the connections they own and those shared with them. With `--account-id`, an agency user sees the account's connections plus the agency's connections shared with its accounts.
- `connection get` and `connection permissions` answer `not_found` (exit 1) for a connection the user cannot see, the same as for one that does not exist. If the ID came from someone else, the connection is probably not shared with this user: say so rather than retrying.
- A connection the agency shares with its accounts can be read from an account but changed only in the agency; changing it from the account is `forbidden` (exit 1).

## Quick Reference

| Task | Command |
|------|---------|
| List connections | `databox connection list` |
| Search connections | `databox connection list --search "google"` |
| Get connection detail | `databox connection get CONNECTION_ID` |
| Update connection name | `databox connection update CONNECTION_ID --name "New Name"` |
| Delete connection | `databox connection delete CONNECTION_ID --force` |
| View permissions | `databox connection permissions CONNECTION_ID` |
| Set permissions | `databox connection set-permissions CONNECTION_ID --access-level everyone --shared-with-accounts` |
| Restrict, not shared with accounts | `databox connection set-permissions CONNECTION_ID --access-level selectedUsers --access-list 31 --no-shared-with-accounts` |

## Permissions

`set-permissions` takes `--access-level everyone|selectedUsers|private`, and `--access-list USER_ID` (repeatable) with `selectedUsers` only. Each ID must be a user of the organization (in a client account, also of its agency) or already on the list; any other is rejected with `invalid_input` naming it, and nothing changes. Either `--shared-with-accounts` or `--no-shared-with-accounts` is required: every call replaces the sharing setting, so read the current one with `connection permissions` first if you only mean to change the access level.

## Notes

- All commands support `--json` for machine-readable output
- Connections are created via the Databox app UI (OAuth flow) — the CLI can list, update, and delete them
- Connection IDs are numeric
