---
name: databox-auth
description: Use when the user wants to authenticate with Databox, set up their API key, validate credentials, or when any databox command fails with "Not authenticated". Triggers on mentions of Databox login, API key, authentication, or credential setup.
---

# Databox Authentication

Set up and validate Databox API credentials via the `databox` CLI.

## Prerequisites

The `databox` CLI must be installed: `npm install -g databox-cli`

## Quick Reference

| Task | Command |
|------|---------|
| Agent or script: use the key for every command, store nothing | `export DATABOX_API_KEY=YOUR_KEY` |
| Store a key | `databox auth login --api-key YOUR_KEY` |
| Store a piped key | pipe it into `databox auth login` (see below) |
| Interactive login (a person at a terminal) | `databox auth login` |
| Validate stored key | `databox auth validate` |
| Validate (JSON) | `databox auth validate --json` |

Piping a key reads the first line of stdin:

```bash
pass show databox | databox auth login
```

## Auth Check Flow

Before running any databox command, verify auth:

```bash
databox auth validate
```

If it fails with "Not authenticated", ask the user for a key, then either set `DATABOX_API_KEY` or run:

```bash
databox auth login --api-key YOUR_KEY
```

Agents should not run a bare `databox auth login`: it prompts only at a terminal. Off a terminal it reads the key from stdin, and exits 2 if nothing is piped. `auth login` does not read `DATABOX_API_KEY`.

`auth login` stores the key in `~/.config/databox-cli/config.json`, even if it cannot validate it. `DATABOX_API_KEY` takes precedence over the stored key.

## Getting an API Key

The key is the user's personal API key (`pak_…`). It is created in the Databox app under **Account Management → Security** (page **Password & Security**, section **API key**, button **Create**).

- Only admin users can create one, and only when the plan includes API access. If the **API key** section is missing, one of the two is not met: the user must ask an admin or upgrade; the CLI cannot work around it.
- One key per user, with no expiry. To rotate it, delete it and create a new one.
- The key acts with its creator's permissions.
- It can be limited to selected IP addresses (**Manage allowed IPs**). A key that works on one machine but fails with "Not authenticated" / 401 on another is usually blocked by that list.

## Common Errors

| Error | Fix |
|-------|-----|
| `Not authenticated. Run "databox auth login" first.` | Agents and scripts: set `DATABOX_API_KEY` (or pass `--api-key` to `auth login`). A person at a terminal: run `databox auth login`. |
| `Warning: API key could not be validated.` | Key was saved but may be invalid. Run `databox auth validate`; check the key and try again. |
| `No API key provided: stdin is not a terminal and nothing was piped. …` (exit 2) | Pass `--api-key`, pipe the key in, or skip `auth login` and set `DATABOX_API_KEY`. |
