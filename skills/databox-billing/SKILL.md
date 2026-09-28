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

## Output

- `billing info` returns `planName`, `planStatus`, `billingPeriod` (`monthly`, `quarterly`, `yearly`, or null when the plan has no billing cycle) and `billingEmail`.
- `billing invoices` lists `invoiceId`, `date`, `amount`, `status`, `receiptNumber` and `downloadUrl`. **`amount` is in US dollars** (USD); there is no currency field. The list is paginated: add `--all` to fetch every invoice.

## Notes

- All commands support `--json` and `--output csv` for machine-readable output
- Billing information is read-only
