---
name: databox-integrations
description: Use when the user wants to browse available integrations in Databox — see what data sources are supported, check if an integration supports datasets. Triggers on mentions of available integrations, supported data sources, or integration capabilities in Databox.
---

# Databox Integration Catalog

Browse available integrations via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List integrations | `databox integration list` |
| Search integrations | `databox integration list --search "google"` |
| Get integration detail | `databox integration get INTEGRATION_ID` |

## Notes

- All commands support `--json` for machine-readable output
- Integrations are read-only — they represent the available data source types in Databox
- Use `supportsDatasets` field to check if an integration supports dataset creation
