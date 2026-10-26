---
name: databox-metrics
description: Use when the user wants to create, manage, or query metrics in Databox — including a metric's values over a date range, custom metrics and their descriptions, dimensions and dimension values, drilldown into the rows behind a metric, metric lineage and usages, verification, or the dashboards a metric is on. Triggers on mentions of metrics, KPIs, custom queries, metric builder, drilldown, dashboards, or where a metric is used in Databox.
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
| Set or clear the description | `databox metric update METRIC_ID --description "Net of refunds"` / `--description ""` |
| Delete metric | `databox metric delete METRIC_ID --force` |
| Values over a date range | `databox metric data --metric-id METRIC_ID --from 2026-06-01 --to 2026-06-30 --granularity daily` |
| Rows behind a value | `databox metric drilldown --metric-id METRIC_ID --start-timestamp 1704067200 --end-timestamp 1735689600` |
| Dimension values | `databox metric dimension-values --metric-id METRIC_ID --source-id 123 --dimension-id country` |
| Lineage | `databox metric lineage METRIC_ID` |
| Where it is used | `databox metric usages METRIC_ID` |
| View verification | `databox metric verification METRIC_ID` |
| Set verification | `databox metric set-verification METRIC_ID --status verified` |
| List dashboards | `databox dashboard list --search marketing` |
| Metrics on a dashboard | `databox dashboard metrics DASHBOARD_ID` |
| Rename a dashboard | `databox dashboard rename DASHBOARD_ID --name "Q4 pipeline"` |

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

On `metric update`, omitted flags keep their current values. `--description` sets the description and `--description ""` clears it; `metric create` takes none, so set it with `metric update` afterwards. A cleared description reads back as `null`. The update's output shows the change at once; `metric get` and `metric list` can lag a few seconds. `--dimension` replaces the whole dimension list and `--clear-dimensions` removes it. In `--filters`, leaving out `conditions` keeps the stored ones (so `{"logicalOperator":"or"}` changes only the operator), and `"conditions": []` clears them.

## Metric Values

`metric data` returns a metric's values over a date range, one per `--granularity` bucket. It works for every kind of metric: integration, custom, calculated and pushed.

| Flag | Required | Description |
|------|----------|-------------|
| `--metric-id` | Yes | Metric ID |
| `--source-id` | See description | Defaults to the part of `--metric-id` before `\|`; if given, it must match. Required for an ID without one, e.g. `GoogleAnalytics4@sessions` (use `sourceId` from `metric list`) |
| `--from`, `--to` | Yes | `YYYY-MM-DD`; `--from` must not be after `--to` |
| `--granularity` | Yes | `daily`, `weekly`, `monthly`, `quarterly`, `yearly` or `allTime` (one bucket for the whole range). No `hourly` |
| `--dimension-id` | No | Dimension to break down by; repeat for several |
| `--filters` | No | One flat group: `{"logicalOperator":"AND","conditions":[{"type":"dimension","field":"country","operator":"ANY_OF","values":["US"]}]}`. Operators: `ANY_OF`, `NONE_OF`, `EQ`, `NEQ`, `CONTAINS`, `NOT_CONTAINS`. Operators are case-insensitive (`"and"`, as `metric get` shows it, works). `field` is required. Not drilldown's nested `groups` |

Bucket dates are in the source's timezone. The table and CSV are followed by a `Sync: <status> — <message>` line on stderr; `--json` returns `{metric, dataPoints, syncInfo}`, with `syncInfo` as `{status, lastSyncedAt, message}`. Read `syncInfo` before trusting the values:

| `syncInfo.status` | What to do |
|------|------|
| `synced` | This call synced the metric: use the values. A `null` value means the bucket has no data |
| `skipped` | No sync was needed: use the values, current as of `lastSyncedAt`. Calling again sooner does not sync |
| `inProgress` | A sync is running; values may be missing or stale. Call again in about a minute |
| `neverSynced` | Not synced yet; values may be empty. Call again shortly |
| `failed` | The last sync failed; values are what was stored before. Retrying won't help until the data source (e.g. its connection) is fixed |
| any other | Values may not be current |

`syncInfo` is `null` (the stderr line reads `Sync: unknown`) for a metric that never syncs, such as a constant.

The first call on a metric that has never synced can take about two minutes. Errors: `504 service_unavailable` means the sync outlived the API's 150 s and is still running, so retry shortly. The endpoint allows 30 calls per account per minute; `429 rate_limited` prints `Retry after N s`, so wait that long. Do not loop on it.

## Dataset Modifications Being Applied

For a few seconds after a dataset modification is saved, `metric create`, `metric update`, and `metric data`, `metric drilldown` and `metric dimension-values` on a dataset metric answer `409 modification_in_progress` with a `Retry after N s` line: wait that long and run the same command again. `409 modification_failed` is final: the modification has to be saved again (`dataset update-modification`) or removed (`dataset clear-modifications`).

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

To reproduce what a dashboard shows, take the metric's dimensions and applied filters from `databox dashboard metrics DASHBOARD_ID --json` and pass them as `--dimension-id` and `--filters`. Without them you get every row in the period. `--json` returns the whole response: rows under `items`, plus `schema` and `pagination`.

## Dimension Values

`metric dimension-values` lists the values of one dimension. `--dimension-id` takes a single dimension id, from the `dimensions` of `metric get` or `metric list --json`; an unknown one is rejected with the metric's available dimensions.

## Lineage and Usages

- `metric lineage METRIC_ID` shows parents (the metrics a calculated metric reads, otherwise its dataset or data source) and children (calculated metrics that read it). A metric not built on a dataset returns 404.
- `metric usages METRIC_ID` shows where a custom metric is used: boards, alerts, goals, reports, forecasts, scorecards and calculated metrics.

## Notes

- All commands support `--json` and `--output csv` for machine-readable output
- Use `--source-id` to filter the metric list by data source or dataset
- `metric data` loads a metric's values over time; `metric drilldown` returns the rows behind a dataset metric's value, without a sync
- `databoard list` and `databoard metrics` are deprecated names for `dashboard list` and `dashboard metrics`; use `dashboard`
- `dashboard rename`: an Admin or Editor can rename any dashboard they can see, a User only one they created. The API refuses a blank name, one over 65 characters, or one with a tab or line break inside
