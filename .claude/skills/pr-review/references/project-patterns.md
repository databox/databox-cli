# Project-Specific Patterns and Pitfalls

Known recurring issues and patterns specific to this codebase. Review agents should check for
these actively — they represent real bugs and review feedback, not hypothetical concerns.

---

## Critical

**Fields guessed from the endpoint name instead of read from the C# contract**
The single largest source of real bugs in this repo. Six commands sent request bodies the API
silently ignored (`interval` for `syncInterval`, `status` for `isVerified`, `tags` for
`synonyms`), four crashed rendering a response shape that never existed, and six table columns
were permanently blank. **Every one of them had a passing unit test**, because the mock encoded
the same guess as the code, so the test and the bug agreed with each other.
- **Watch for**: any request body field, response interface member or table column that cannot
  be traced to `ingestion-api/src/IngestionApi.Core/Contracts/{Request,Response}/V2/`. Check the
  contract, not the endpoint name, and not the existing CLI code.
- **Watch for**: envelope assumptions — `response.items` where the endpoint returns a bare
  array, or `{items: […]}` handed straight to `formatOutput`.
- A command that sends a body needs **both** an e2e test and a unit test asserting the body via
  `lastBody(method, path)`. A unit test alone cannot catch this class of bug.
- Inheritance counts: a `…Detail` response extends its `…ListItem`, so a detail view that
  returns fewer fields than a list row is a defect, not a design choice.

**Unwrapped JSON.parse on user-provided flag values**
~10 commands parse flag values with bare `JSON.parse()` (`--schema`, `--records`, `--data`,
`--date`, `--measure`, `--tags`, `--columns`). Malformed JSON produces a raw `SyntaxError`
with no actionable message. Only `ask-genie.ts` wraps its `JSON.parse` correctly.
- **Watch for**: any `JSON.parse(flags.xxx)` or `JSON.parse(args.xxx)` without a try/catch
  that calls `this.error('Invalid JSON for --flagname: ...', {exit: 2})`.

```typescript
// Bad — raw SyntaxError to user
body.schema = JSON.parse(flags.schema) as SchemaType

// Good — user-friendly error
try {
  body.schema = JSON.parse(flags.schema) as SchemaType
} catch {
  this.error('Invalid JSON for --schema. Expected format: [{"columnId":"...","dataType":"..."}]', {exit: 2})
}
```

---

## High

**A flag rename that does not sweep every surface**
Renaming a flag touches five places, and a PR that updates only the first is worse than one that
renames nothing — the docs then actively mislead. `--tags`→`--synonyms` and `--key`→
`--integration-key` each left stale references behind, and a review was filed against the
*correct* README on the assumption a rename had happened that had not.
- **Watch for**: a changed flag name in `src/commands/` with no matching change in `test/`,
  `README.md` (regenerate with `npx oclif readme`), `skills/databox-*/SKILL.md` and
  `CHANGELOG.md`. Grep the old name across the repo; the count should be zero.
- Before reporting a rename as a bug, confirm the old flag is actually gone. Different commands
  legitimately use different names for the same concept (`--data-source-id` on `dataset create`,
  `dataset list` and `metric data`; `--source-id` on `metric list`).

**Double-parse inconsistency**
`BaseCommand.init()` parses flags into `this.flags`. Most commands with args also call
`this.parse(ClassName)` in `run()` to destructure `{args, flags}` locally. Some commands
reference `flags` (local) for domain flags but `this.flags` (from init) for base flags
like `json` and `account-id`. This works today but is fragile.
- **Watch for**: mixing `flags.xxx` and `this.flags.xxx` in the same command for the same
  or overlapping data.

---

## Medium

**Empty update bodies**
Update commands whose flags are all optional must refuse to send an empty PATCH and name the
flags they wanted. Every such command now does; `test/validation/empty-body.test.ts` sweeps them
and its last test walks `src/commands` to assert the table still covers every guard.
- **Watch for**: a new all-optional update command that builds a body conditionally and never
  checks whether it stayed empty, or one added without a row in that sweep.
- The guard is **exit 1**, not exit 2, per `.claude/rules/commands.md` — the command is
  well-formed, it just has nothing to do. Do not report this as an exit-code bug.

---

## Low

**ask-genie bypasses ApiClient**
`analyze/ask-genie.ts` makes a direct `fetch()` call to a different service URL, accessing
`this.apiClient.apiKey` directly. Intentional (SSE streaming not supported by ApiClient)
but creates a maintenance risk if ApiClient's header logic changes.
- **Watch for**: new commands that bypass ApiClient for non-standard protocols — they
  should document why.

**Exit codes**
The convention is settled in `.claude/rules/commands.md`: **exit 2** for input validation
(`requireNumericId`, `requireUuid`, `parseJsonFlag`), **exit 1** for general errors, including the
empty-body guard above.
- **Watch for**: new commands using the wrong code. Check the rule before reporting one as wrong.

**Hand-rolled pagination or sorting flags**
`src/lib/flags.ts` owns `paginationFlags` and `sortFlags` (page is 0-indexed with `min: 0`,
page-size `min: 1`), plus `addPagination`/`addSorting` for the query string. Declaring these
inline per command is how the defaults drifted apart in the first place.
- **Watch for**: a list command declaring its own `page`/`page-size`/`sort` flags, or declaring
  pagination flags it then never sends as query params.

---

## Per-agent mapping

| Agent | Relevant pattern sections |
|---|---|
| **Correctness** | Guessed contract fields, unwrapped JSON.parse, double-parse, empty-body guard, exit codes |
| **Consistency** | Flag-rename sweep, hand-rolled pagination/sorting flags, double-parse, exit codes |
| **Security** | ask-genie bypasses ApiClient (direct apiKey access) |
| **Testing** | Missing `lastBody()` assertion on any command that sends a body; missing error-path tests for JSON.parse, resource IDs and empty bodies — each has a sweep under `test/validation/` whose final test asserts the table still covers every call site |
