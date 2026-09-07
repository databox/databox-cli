# E2E Testing Conventions

End-to-end suites live in `test/e2e/` and spawn the **built** CLI against a **real** API.
They are separate from the mocked unit suite in `test/commands/`. Full usage:
`test/e2e/README.md`.

## Boundaries

| | Unit (`test/commands/*.test.ts`) | E2E (`test/e2e/*.e2e.ts`) |
|---|---|---|
| Runs | `runCommand` in-process | `node bin/run.js` as a child process |
| API | `global.fetch` mocked | Real, over the network |
| Asserts | stdout string contents | exit code + stdout/stderr |
| Command | `npm test` | `npm run test:e2e` |

The `.e2e.ts` suffix is what keeps them apart — `npm test`'s glob is `test/**/*.test.ts`.
Never rename an e2e file to `.test.ts`, and never add `test/e2e` to `.mocharc.yml`.

## Rules

- **Everything goes through the CLI.** No suite makes a direct HTTP call. Setup,
  assertions and teardown all use `cli()`. The e2e layer has no API client of its own,
  so it cannot drift from the one under test.
- **One file per command group**, named for the group: `test/e2e/<group>.e2e.ts`.
- **Name every created resource** with `e2eName(label)` and register it on a
  `ResourceTracker`; tear it down in the suite's `after()`.
- **Always pass `--force`** to destructive commands. Child stdin is `'ignore'`, so an
  interactive `confirm()` would hang until the mocha timeout.
- **Match error text with `errorText(result)`**, never `result.stderr` directly — the
  CLI hard-wraps messages, so a phrase can be split across lines with padding.
- **Never add mocha `--retries` or `--parallel`.** Mocha retries re-run the whole test,
  creating resources twice; parallel suites collide on shared account state. Retry belongs
  in `retryRead` (poll a read until the API's cache catches up) and `cliWithRetry` (re-run
  a command whose failure matches a transient environment fault). `cliWithRetry` is safe
  for assertions too — a genuine failure does not match a transient pattern, and a matched
  one is still returned once attempts run out. Shared dev environments do fail in bursts,
  including spurious 401s on a valid key.
- **No API key outside `helpers/environments.ts`**, and never a production key.
- **Never mutate a resource the suite did not create without `withRestore()`.** It
  records the undo on disk before the change, so an interrupted run can be repaired
  with `npm run test:e2e:cleanup`. A bare `finally` does not survive Ctrl-C.

## Classifying a failure

A failing e2e test means one of three things. Say which, in the test:

1. **A CLI defect** — **fix the command.** A skipped test is green and CI cannot tell it
   from a passing one, so parking a known-broken command as a skip makes the suite lie.
   Only if the fix is genuinely deferred, use `it.skip` with `[BROKEN: <what>]` in the
   title plus a comment giving the API's real contract, the observed symptom, and the
   source file that fixes it — and keep that list short.
2. **An environment outage** — `this.skip()` at runtime via `serviceUnavailable(result)`,
   which recognises the API's own 5xx/service-down messages. Never hard-code an outage
   as expected behaviour.
3. **A capability the account lacks** — `this.skip()` with a logged reason: no agency
   account, no Advanced Security add-on, no databoards, no connections.

A skip must always print or carry its reason. A silent skip is worse than a failure.

## Verifying a suspected CLI defect

Before marking anything `[BROKEN]`, confirm it against the raw endpoint with `curl`,
so the report distinguishes a CLI bug from an API one. Two defect families found so far,
both invisible to the unit suite:

- **Envelope drift** — a command reads `response.items` where the API returns a bare
  array, or hands `{items: […]}` straight to `formatOutput`. The unit mock defines the
  shape, so it always agrees with itself. Only a real response settles it.
- **Request-body drift** — a command sends a field name the API does not accept
  (`interval` vs `syncInterval`, `status` vs `isVerified`, `tags` vs `synonyms`). These
  commands could never succeed, and every one of them had a passing unit test.

**Any command that sends a request body needs both**: an e2e test, and a unit test
asserting the body via `lastBody(method, path)` from `test/helpers.ts`. The unit
assertion is the cheap guard that runs on every `npm test`; the e2e test is what proves
the field names are the ones the API actually wants.

```typescript
it('sends syncInterval, not interval', async () => {
  await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '60'], {root: process.cwd()})
  expect(lastBody('PUT', '/v2/datasets/123/sync-frequency')).to.deep.equal({syncInterval: 60})
})
```

Note that `@oclif/test`'s `runCommand` refuses an **empty-string** flag value even though
the real binary accepts one, so assertions about clearing a nullable field belong in the
e2e suite.

## The API is the source of truth

`ingestion-api` defines the contract; the CLI follows it. Concretely:

- A command exposes **every field** of its request contract in
  `IngestionApi.Core/Contracts/Request/V2/`, and every query parameter its controller
  action declares.
- `--json` returns **what the endpoint returned**. Do not hand-pick a subset into a new
  object, and do not reshape values. List commands unwrap `response.items` to a bare
  array — that is the one established convention — but the item objects pass through whole.
- Optional string fields are guarded with `!== undefined`, never truthiness, so an empty
  string can clear a nullable field.
- Response interfaces mirror the response contract, including inherited members (a
  `…Detail` type extends its `…ListItem`).

Re-derive the mapping from the API source rather than from memory or from the existing
CLI code, and confirm anything surprising against a live endpoint with `curl`.
