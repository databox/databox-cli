---
name: databox-billing
description: Use when the user wants to view billing information, plan details, or invoices in Databox. Triggers on mentions of billing, invoices, subscription, plan, or payment in Databox.
---

# Databox Billing

View billing and plan information via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| View billing/plan | `databox billing info` |
| List invoices | `databox billing invoices` |

## Notes

- All commands support `--json` for machine-readable output
- Billing information is read-only
