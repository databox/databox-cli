# End-to-end tests

These suites spawn the **built** `databox` binary as a child process and assert on
its exit code and stdout, against a **real** API. They are the counterpart to
`ingestion-api`'s `src/IngestionApi.Api/ExternalTests/v2/` scripts, one layer up:
where those assert on HTTP responses, these assert on what a user actually sees.

The unit suite in `test/commands/` mocks `global.fetch`, so it can only confirm the
CLI does what we *believe* the API does. These suites confirm what it *actually* does.

## Running

```bash
npm run test:e2e                       # develop6, with its built-in key — zero setup
npm run test:e2e -- --grep "^dataset " # one suite
npm run test:e2e:cleanup               # sweep resources left by an interrupted run
```

`test:e2e` builds first — `bin/run.js` loads from `lib/`, which is gitignored.

## Choosing a target

| Variable | Purpose |
|---|---|
| `DATABOX_E2E_ENV` | Named environment. Defaults to `develop6`. |
| `DATABOX_E2E_API_URL` | Explicit base URL. Wins over `DATABOX_E2E_ENV`. |
| `DATABOX_E2E_API_KEY` | API key. Wins over an environment's built-in default. |
| `DATABOX_E2E_ACCOUNT_ID` | Sent as `x-account-id` on every command. |
| `DATABOX_E2E_ALLOW_PROD` | Required (`=1`) to run against production. |
| `DATABOX_E2E_ALLOW_INSECURE_TLS` | `=1` disables TLS verification, for local self-signed certs. |
| `DATABOX_E2E_AGENTIC_URL` | Enables the `analyze ask-genie` suite (separate service). |

```bash
npm run test:e2e                                            # develop6 + built-in key

DATABOX_E2E_ENV=develop10 DATABOX_E2E_API_KEY=pak_… \
  npm run test:e2e                                          # another named environment

DATABOX_E2E_API_URL=https://ingestion-api-pr-482.databox.com \
DATABOX_E2E_API_KEY=pak_… npm run test:e2e                  # any URL, no code change

DATABOX_E2E_ENV=production DATABOX_E2E_API_KEY=pak_… \
DATABOX_E2E_ALLOW_PROD=1 npm run test:e2e                   # production
```

`helpers/environments.ts` holds the registry. An environment name that isn't in it is
turned into `https://ingestion-api-<name>.databox.com`, so ephemeral environments work
without a code change. When environment resolution becomes dynamic, `resolveEnvironment()`
is the only function that changes.

Every run prints its target before the first test. Read that banner — it is the
difference between a develop run and a production one.

### Keys

`develop6` and `local` carry a default key, matching the ingestion-api convention.
Everything else must supply one, and **production never inherits a default**.

Two rules: `helpers/environments.ts` is the only file a key may appear in, and no
production key is ever committed.

## Safety

- **Production is a two-step opt-in** — naming it *and* `DATABOX_E2E_ALLOW_PROD=1`. These
  suites create and delete real resources.
- **The resolved URL is always passed explicitly** to the CLI. `ApiClient` defaults to
  `https://api.databox.com`, so an unset URL would mean production.
- **The child environment is scrubbed** of every `DATABOX_*` variable before the harness
  sets its own, so an exported `DATABOX_API_KEY` cannot silently redirect a run.
- **Each child gets an empty `HOME`**, so `~/.config/databox-cli/config.json` can neither
  influence a run nor be modified by one.
- **Every change to a resource the suite does not own is undone** — see below.

## Undoing changes to shared resources

Almost everything the suites touch is a `cli-e2e-*` fixture they created and delete.
Three things are not: the **account**, the signed-in **profile**, and an existing
**connection** — there is no way to exercise `account update`, `profile update` or
`connection update` without changing something real.

For those, `withRestore()` writes the undoing command to `.e2e-restore.json`
**before** the mutation, and removes it only once the value is back:

```typescript
await withRestore('account.name', ['account', 'update', '--name', original, '--json'], async () => {
  expectOk(await cli(['account', 'update', '--name', renamed, '--json']))
  // ...assertions...
})
```

A `finally` alone is not enough — it does not survive Ctrl-C, a crash, or a failed
restore. Because the undo log is on disk, anything left in it is an outstanding change:

- the root `before()` hook replays leftovers **before** the run, so suites read real values;
- the root `after()` hook replays them again;
- `npm run test:e2e:cleanup` replays whatever an interrupted run left behind.

Entries record which environment they were taken against and are never replayed onto a
different one. The file is gitignored. If a run is interrupted, the fix is always the
same: `npm run test:e2e:cleanup`.

## Conventions

- One file per command group: `test/e2e/<group>.e2e.ts`. The `.e2e.ts` suffix keeps
  these out of `npm test`, whose glob is `test/**/*.test.ts`.
- Every created resource is named via `e2eName(label)` → `cli-e2e-<label>-<ts>-<rand>`,
  and registered with a `ResourceTracker` that tears it down in reverse order.
- `helpers/cleanup.ts` sweeps anything named `cli-e2e-*` after the run, and can be run
  standalone after an interrupted one.
- **Everything goes through the CLI.** No suite makes a direct HTTP call — setup,
  assertions and teardown all shell out. The e2e layer has no API client to drift.
- Destructive commands always take `--force`: stdin is `'ignore'`, so an interactive
  `confirm()` prompt would hang until the mocha timeout.
- Environment-dependent suites skip with `skipWith(this, reason)` rather than failing (no
  agency account, add-on not enabled, no databoards). It prints the reason; never call a
  bare `this.skip()`, which is indistinguishable from a pass.
- Reads that race the API's cache use `retryRead`. Never wrap a create in it — mocha
  `--retries` and `--parallel` are off for the same reason.
- To check a cell under a named column, read `--output csv` back with `parseCsv` /
  `csvColumn` from `helpers/csv.ts` rather than matching the table's text.

## The contract the suites pin

What a user sees, which the unit suite can only assume:

- **`--json` returns what the endpoint returned.** A plain list (`{items}` or
  `{items, pagination}`) unwraps to a bare array: `dataset list`, `sync-frequency-options`,
  `column-metadata`, `modification-functions`, `metric usages`, and the rest. A response
  whose siblings carry data comes through whole: `dataset schema` `{items, primaryKey}`,
  `dataset data` `{items, schema, pagination, lastUpdatedAt}`, `preview-modification`
  `{items, pagination: {totalItems}, schema}`, `metric drilldown` `{items, schema,
  pagination}`, both `lineage` commands, `dataset modifications`, `databoard metrics`
  `{datablocks}` and `metric dimension-values` `{dimensionValues}`.
- **Mutations that return the resource print it.** `set-sync-frequency`, `set-timezone` and
  `set-verification` print it under `--json` (or `--output csv`) and a confirmation line in
  table mode. `metric create`/`update` print the metric detail in every mode, and
  `update-modification` prints the saved modification, as a table like `dataset modifications`.
- **Exit codes:** 0 on success; 1 for an API error, rendered as its code, message,
  `Field:` and `Request ID:`; 2 for a usage error the CLI catches itself (a bad option value,
  malformed JSON, an empty `--name`) and for failing to reach the API at all.
- **`--output csv`** prints a header and one line per row, with no table rule or footer.
  **`--verbose`** traces each request to stderr with the key redacted; stdout stays clean.
  **`--all`** fetches every page.
- **Two questions the unit suite cannot answer**, settled here against real rows: that
  `dataset data` and the modification preview key a renamed column's cells by column id
  (`src/lib/dataset-rows.ts`), and that `metric drilldown` rows are keyed by
  `schema.items[].id`.

## Reading the output

A pending (`-`) test is never silent — it always says why. There are three kinds, and
they mean quite different things:

| Marker | Meaning | What to do |
|---|---|---|
| `skip: API reported a service-side failure …` | The target environment is unhealthy, not the CLI. | Re-run later, or point at a healthier environment. |
| `skip: account has no …` / `is not an agency` / `lacks the … add-on` | The account cannot exercise this path. | Nothing, unless you expected it to. |
| `[BROKEN: …]` in the title | A confirmed CLI defect, skipped so the suite stays green. **None currently.** | Fix the command, then unskip. |

A confirmed CLI defect should be fixed, not left skipped — a skipped test is green, and
CI cannot tell it from a passing one. Use `[BROKEN: …]` only to park a defect you have
deliberately decided not to fix yet, and keep the list short.

Shared dev environments fail in bursts. Fixture setup retries transient failures via
`cliWithRetry`, and reads race the API's cache via `retryRead`; assertions never retry.
A create that succeeds server-side but reports a 5xx gets retried and leaves an orphan —
the `cli-e2e-` sweeper is what makes that safe.

## Known defects the suites surface

Tests for genuinely broken commands are `it.skip`-ped with `[BROKEN: …]` in the title, so
they stay visible in the run output. Unskip them when the command is fixed.

The suite found eight broken commands on its first run, in two families. **All are now
fixed**; the table is kept as a record of what this layer catches and the unit suite
cannot.

**Envelope drift** — the command and the API disagreed about `items`:

| Command | Was | Now |
|---|---|---|
| `data-source sync-frequencies` | Read `response.items`, but the API returned a bare array: `--json` printed the literal `undefined` and **exited 0**; table mode threw `Cannot read properties of undefined (reading 'length')`. | Since replaced by `data-source sync-frequency-options`, a new route that answers `{items}`; the command unwraps it. |
| `dataset sync-frequencies` | Same. | Same: now `dataset sync-frequency-options`. |
| `dataset column-metadata` | The mirror image — the API returns `{items: […]}` and the command passed it straight to `formatOutput`. Table mode threw `data.map is not a function`. | Unwraps `response.items`. |

**Request-body drift** — the command sent a field the API does not accept, so it could
*never* succeed:

| Command | Sent | API requires |
|---|---|---|
| `data-source set-sync-frequency` | `{interval}` | `{syncInterval}` |
| `dataset set-sync-frequency` | `{interval}` | `{syncInterval}` |
| `dataset set-verification` | `{status: "verified"}` | `{isVerified: boolean}` |
| `metric set-verification` | `{status: "verified"}` | `{isVerified: boolean}` |
| `dataset set-metadata --tags` | `{tags}` | no such field — the flag is now `--synonyms`, matching `{description, synonyms, defaultTimeDimension}` |

Every one of these passed in the unit suite, because its mocks supplied the shape the
command expected. `test/helpers.ts` now records request bodies (`lastBody()`), and the
five commands above assert on theirs, so this family cannot silently return.

The two stale types once listed here (`account usage` buckets, `data-source get`'s
`title`) now mirror the contract, and `metric create` takes `--aggregation-function` and
`--dimension`, which the metric suite exercises.

The re-sync with ingestion-api v2 found a second round of request-body drift — dataset
schema `columnId` (now `id`), metric column references `{id, name}` (now
`{id, displayName}`), modification `filters[]` (now `conditions`), and `sourceId` /
`dimensionIds` on `metric dimension-values` and `metric drilldown` — plus the removed
routes behind `dataset add-modification` (use `update-modification`) and `metric data`
(use `metric drilldown`). The suites use the current names throughout.

## Findings for the API team

These are `ingestion-api` bugs, not CLI ones — the CLI sends exactly what the contract
documents. Verified with `curl` against the raw endpoints.

- **`GET /v2/datasets?dataSourceId=…` filtering was unreliable, and `totalItems` ignored
  the filter.** A filtered call could return `items: []` while `pagination.totalItems`
  reported the *unfiltered* count (observed: 0 items, 227 total), and a different
  `pageSize` returned the rows. Cause: `DatasetService.ListDatasets` paged upstream and
  then filtered in memory. **Fixed** in ingestion-api on
  `fix/v2-dataset-list-datasource-filter` — it now passes `parentId` to account-service,
  which filters in the query. Until that is deployed, e2e assertions about list contents
  deliberately do not rely on this filter.
- **`GET /v2/data-sources/{id}` and `GET /v2/datasets` serve stale reads after a
  delete** — a deleted resource keeps coming back for a short window, so the suite polls
  rather than reading once.
- **`POST /v2/datasets/{id}/duplicate` cannot duplicate a dataset created through the
  API** — the only kind the CLI can create. account-service refuses to duplicate a space
  access with no `data_sources` row, and a pushed dataset has none, so it failed with the
  opaque "Data source type not found."

  This is a product limitation rather than only a bug: lifting the upstream guard would
  not be enough, because the ingestion identity of a copy — its own token and push
  endpoint, and which dataset data pushed to the original lands in — is undefined.
  **Handled** in ingestion-api on `fix/v2-duplicate-ingestion-dataset-message`, which
  rejects it with an actionable message instead. The e2e test asserts the refusal and
  accepts either message until that is deployed.
