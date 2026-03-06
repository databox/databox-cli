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
| Interactive login | `databox auth login` |
| Login with key | `databox auth login --api-key YOUR_KEY` |
| Validate stored key | `databox auth validate` |
| Validate (JSON) | `databox auth validate --json` |

## Auth Check Flow

Before running any databox command, verify auth:

```bash
databox auth validate
```

If it fails with "Not authenticated", run:

```bash
databox auth login
```

The API key is stored in `~/.config/databox-cli/config.json`.

## Getting an API Key

Users can find their API key in the Databox app under Account Settings > API Keys.

## Common Errors

| Error | Fix |
|-------|-----|
| `Not authenticated. Run "databox auth login" first.` | Run `databox auth login` |
| `Warning: API key could not be validated.` | Key was saved but may be invalid. Check the key and try again. |
