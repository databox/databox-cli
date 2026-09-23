---
name: databox-connections
description: Use when the user wants to view or manage connections in Databox — list, update, delete connections, or manage connection permissions. Triggers on mentions of connections, OAuth connections, or connection permissions in Databox.
---

# Databox Connection Management

View and manage connections via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List connections | `databox connection list` |
| Search connections | `databox connection list --search "google"` |
| Get connection detail | `databox connection get CONNECTION_ID` |
| Update connection name | `databox connection update CONNECTION_ID --name "New Name"` |
| Delete connection | `databox connection delete CONNECTION_ID --force` |
| View permissions | `databox connection permissions CONNECTION_ID` |
| Set permissions | `databox connection set-permissions CONNECTION_ID --access-level everyone --shared-with-clients` |
| Restrict, not shared with clients | `databox connection set-permissions CONNECTION_ID --access-level selectedUsers --access-list 31 --no-shared-with-clients` |

## Permissions

`set-permissions` takes `--access-level everyone|selectedUsers|private`, and `--access-list USER_ID` (repeatable) with `selectedUsers` only. Either `--shared-with-clients` or `--no-shared-with-clients` is required: every call replaces the sharing setting, so read the current one with `connection permissions` first if you only mean to change the access level.

## Notes

- All commands support `--json` for machine-readable output
- Connections are created via the Databox app UI (OAuth flow) — the CLI can list, update, and delete them
- Connection IDs are numeric
