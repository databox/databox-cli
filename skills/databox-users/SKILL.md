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
| Filter by role | `databox user list --role editor` |
| Update role | `databox user update USER_ID --role admin` |
| Rename | `databox user update USER_ID --name "Jane Doe"` |
| Remove user | `databox user delete USER_ID --force` |

## Roles

Available roles: `admin`, `user`, `editor`, `viewer`. `--role` on `invite`, `update` and `list` accepts only these.

Inviting an email that is already in the account, invited or active, fails with `duplicate_record`; change that user with `user update` instead.

## Notes

- All commands support `--json` for machine-readable output
- User management requires admin privileges
- The account owner cannot be deleted
