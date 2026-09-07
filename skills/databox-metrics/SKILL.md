---
name: databox-metrics
description: Use when the user wants to create, manage, or query metrics in Databox — including custom metrics, metric data, dimensions, drilldown, or verification. Triggers on mentions of metrics, KPIs, custom queries, metric builder, or data visualization in Databox.
---

# Databox Metrics Management

Create, query, and manage metrics via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List metrics | `databox metric list` |
| List by data source | `databox metric list --data-source-id 42` |
| Get metric detail | `databox metric get METRIC_ID` |
| Create metric | `databox metric create --name "Revenue" --dataset-id 123 --measure '{"id":"amount","name":"Amount"}' --date '{"id":"date","name":"Date"}'` |
| Update metric | `databox metric update METRIC_ID --name "New Name"` |
| Delete metric | `databox metric delete METRIC_ID --force` |
| Load metric data | `databox metric data --metric-id METRIC_ID --date-from 2024-01-01 --date-to 2024-12-31 --granularity monthly --dataset-id 123` |
| Get dimension values | `databox metric dimension-values --metric-id METRIC_ID --dimension country --dataset-id 123` |
| Drilldown | `databox metric drilldown --metric-id METRIC_ID --dataset-id 123 --start-timestamp 1704067200 --end-timestamp 1735689600` |
| View usages | `databox metric usages METRIC_ID` |
| View verification | `databox metric verification METRIC_ID` |
| Set verification | `databox metric set-verification METRIC_ID --status verified` |

## Metric IDs

Metric IDs are strings in one of these formats:
- Custom query metrics: `500|custom_query_100`
- Integration metrics: `GoogleAnalytics4@sessions`
- Custom push metrics: `my_custom_metric`

Only custom query metrics can be created, updated, and deleted via the CLI.

## Notes

- All commands support `--json` for machine-readable output
- Use `--data-source-id` to filter the metric list by data source
