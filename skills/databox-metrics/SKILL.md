---
name: databox-metrics
description: Use when the user wants to create, manage, or query metrics in Databox — including custom metrics, dimensions and dimension values, drilldown into the rows behind a metric, metric lineage and usages, or verification. Triggers on mentions of metrics, KPIs, custom queries, metric builder, drilldown, or where a metric is used in Databox.
---

# Databox Metrics Management

Create, query, and manage metrics via the `databox` CLI.

## Prerequisites

Must be authenticated. If not, use the `databox-auth` skill first.

## Quick Reference

| Task | Command |
|------|---------|
| List metrics | `databox metric list` |
| List by source | `databox metric list --source-id 42` |
| Search by name or ID | `databox metric list --search revenue` |
| Get metric detail | `databox metric get METRIC_ID` |
| Create metric | `databox metric create --name "Revenue" --dataset-id 123 --measure '{"id":"amount","displayName":"Amount"}' --date '{"id":"date","displayName":"Date"}'` |
| Update metric | `databox metric update METRIC_ID --name "New Name"` |
| Delete metric | `databox metric delete METRIC_ID --force` |
| Rows behind a value | `databox metric drilldown --metric-id METRIC_ID --start-timestamp 1704067200 --end-timestamp 1735689600` |
| Dimension values | `databox metric dimension-values --metric-id METRIC_ID --source-id 123 --dimension-id country` |
| Lineage | `databox metric lineage METRIC_ID` |
| Where it is used | `databox metric usages METRIC_ID` |
| View verification | `databox metric verification METRIC_ID` |
| Set verification | `databox metric set-verification METRIC_ID --status verified` |
| List databoards | `databox databoard list --search marketing` |
| Metrics on a databoard | `databox databoard metrics DATABOARD_ID` |

## Metric IDs

Metric IDs are strings in one of these formats:
- Custom metrics: `500|custom_query_100` (the part before `|` is the source ID)
- Integration metrics: `GoogleAnalytics4@sessions`
- Custom push metrics: `my_custom_metric`

Only dataset-based custom metrics can be created, updated, and deleted via the CLI. `verification` and `set-verification` need an ID with `|`; an integration key without one is rejected with a 400. `usages` only looks up custom query metrics and returns an empty list for any other.

## Creating and Updating Custom Metrics

A custom metric is built on a **dataset** (`--dataset-id`, not a data source). Column references are JSON objects `{"id", "displayName"}`, with the `id` taken from `databox dataset schema DATASET_ID`:

```bash
databox metric create --name "Revenue by country" --dataset-id 123 \
  --measure '{"id":"amount","displayName":"Amount"}' \
  --date '{"id":"created_at","displayName":"Created At"}' \
  --dimension '{"id":"country","displayName":"Country"}' \
  --aggregation-function sum \
  --filters '{"logicalOperator":"and","conditions":[{"field":"country","operator":"ANY_OF","values":["US","UK"]}]}'
```

- `--aggregation-function`: `sum` (default), `avg`, `min`, `max` or `count`
- `--dimension` is repeatable
- `--filters` is one group: `{"logicalOperator": "and"|"or", "conditions": [{"field", "operator", "values"}]}`
- `create` prints the new metric, including its ID; add `--idempotency-key "$(uuidgen)"` if a retry must not create a second one

On `metric update`, omitted flags keep their current values. `--dimension` replaces the whole dimension list and `--clear-dimensions` removes it. In `--filters`, leaving out `conditions` keeps the stored ones (so `{"logicalOperator":"or"}` changes only the operator), and `"conditions": []` clears them.

## Drilldown

`metric drilldown` returns the rows behind a metric's value for a period. Only dataset-backed custom metrics support it — check the Drilldown column of `metric list`.

| Flag | Required | Description |
|------|----------|-------------|
| `--metric-id` | Yes | Metric ID |
| `--source-id` | No | The dataset the metric is built on. Defaults to the part of `--metric-id` before `\|`; if given, it must match |
| `--start-timestamp`, `--end-timestamp` | Yes | Unix timestamps in seconds; start must not be after end |
| `--dimension-id` | No | Dimension to break down by; repeat for several |
| `--filters` | No | `{"logicalOperator", "groups": [{"logicalOperator", "conditions": [{"type", "field", "operator", "values"}]}]}` |
| `--sort-by`, `--sort-order` | No | Sort by a column id; `--sort-order` needs `--sort-by` |
| `--page`, `--page-size`, `--all` | No | `--page-size` up to 1000 |

To reproduce what a databoard shows, take the metric's dimensions and applied filters from `databox databoard metrics DATABOARD_ID --json` and pass them as `--dimension-id` and `--filters`. Without them you get every row in the period. `--json` returns the whole response: rows under `items`, plus `schema` and `pagination`.

## Dimension Values

`metric dimension-values` lists the values of one dimension. `--dimension-id` takes a single dimension id, from the `dimensions` of `metric get` or `metric list --json`; an unknown one is rejected with the metric's available dimensions.

## Lineage and Usages

- `metric lineage METRIC_ID` shows parents (the metrics a calculated metric reads, otherwise its dataset or data source) and children (calculated metrics that read it). A metric not built on a dataset returns 404.
- `metric usages METRIC_ID` shows where a custom metric is used: boards, alerts, goals, reports, forecasts, scorecards and calculated metrics.

## Notes

- All commands support `--json` and `--output csv` for machine-readable output
- Use `--source-id` to filter the metric list by data source or dataset
- There is no command that loads a metric's aggregated values over time; use `metric drilldown` for the underlying rows
