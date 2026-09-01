---
name: databox-users
description: Use when the user wants to manage team members in their Databox account — invite users, update roles, or remove users. Triggers on mentions of user management, invitations, team members, or role changes in Databox.
---

# Databox User Management

Manage team members via the `databox` CLI.

## Prerequisites

Must be authenticated with admin privileges. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List users | `databox user list` |
| Get user detail | `databox user get USER_ID` |
| Invite user | `databox user invite --email user@example.com --role user` |
| Update role | `databox user update USER_ID --role admin` |
| Remove user | `databox user delete USER_ID --force` |

## Roles

Available roles: `admin`, `user`

## Notes

- All commands support `--json` for machine-readable output
- User management requires admin privileges
- The account owner cannot be deleted
