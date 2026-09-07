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
- Environment-dependent suites call `this.skip()` with a logged reason rather than
  failing (no agency account, add-on not enabled, no databoards).
- Reads that race the API's cache use `retryRead`. Never wrap a create in it — mocha
  `--retries` and `--parallel` are off for the same reason.

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
| `data-source sync-frequencies` | Read `response.items`, but the API returns a bare array: `--json` printed the literal `undefined` and **exited 0**; table mode threw `Cannot read properties of undefined (reading 'length')`. | Reads the array; also uses the real `syncInterval` field and surfaces `isSelected`/`availability`. |
| `dataset sync-frequencies` | Same. | Same fix. |
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

**Still open** — stale types, no user-visible symptom since `formatSingle` prints
whatever it is given:

- `src/commands/account/usage.ts` declares `{current, limit}` per bucket; the API returns
  `{count, limit|null}` and adds a `clients` bucket the interface omits.
- `src/commands/data-source/get.ts` declares `title`; the API returns `name`.

**Coverage gap**: `metric create` cannot set `aggregationFunction` or `dimensions`,
though the API accepts both.

## Findings for the API team

These are `ingestion-api` bugs, not CLI ones — the CLI sends exactly what the contract
documents. Verified with `curl` against the raw endpoints.

- **`GET /v2/datasets?dataSourceId=…` filtering is unreliable, and `totalItems` ignores
  the filter.** A filtered call can return `items: []` while `pagination.totalItems`
  reports the *unfiltered* count (observed: 0 items, 227 total). The same call with a
  different `pageSize` sometimes returns the rows. Because of this, e2e assertions about
  list contents do not rely on this filter.
- **`GET /v2/data-sources/{id}` and `GET /v2/datasets` serve stale reads after a
  delete** — a deleted resource keeps coming back for a short window, so the suite polls
  rather than reading once.
- **`POST /v2/datasets/{id}/duplicate` rejects datasets on a DataboxAPI (ingestion) data
  source** with "Data source type not found." — the only kind the CLI can create. Worth
  confirming whether duplicate is meant to support them.
