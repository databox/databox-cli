# Project-Specific Patterns and Pitfalls

Known recurring issues and patterns specific to this codebase. Review agents should check for
these actively — they represent real bugs and review feedback, not hypothetical concerns.

---

## Critical

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

**Missing requireNumericId on non-dataset commands**
Only dataset commands validate IDs with `requireNumericId()`. Commands in `connection/`,
`user/`, `client/`, `data-source/`, `metric/`, `databoard/` interpolate `args.xxxId`
directly into URL paths without validation. A non-numeric ID produces a confusing API 404
instead of a clear validation error.
- **Watch for**: new commands with `Args.string()` for resource IDs that skip `requireNumericId()`.

**Double-parse inconsistency**
`BaseCommand.init()` parses flags into `this.flags`. Most commands with args also call
`this.parse(ClassName)` in `run()` to destructure `{args, flags}` locally. Some commands
reference `flags` (local) for domain flags but `this.flags` (from init) for base flags
like `json` and `account-id`. This works today but is fragile.
- **Watch for**: mixing `flags.xxx` and `this.flags.xxx` in the same command for the same
  or overlapping data.

---

## Medium

**Inconsistent update command validation**
Five update commands guard against empty bodies (`Object.keys(body).length === 0`):
`connection`, `account`, `profile`, `metric`, `client`. Three do not: `dataset update`
(optional `--title` with no guard), `data-source update` and `user update` (both have
`required: true` on their only flag, sidestepping the issue). New update commands with
optional flags must include the guard.
- **Watch for**: update commands with all-optional flags that build a body conditionally
  but never check if it's empty.

**Inconsistent pagination defaults**
`dataset list` has explicit `default: 0` and `default: 25` for page/page-size. Other list
commands like `connection list` have no defaults. This means some list commands behave
differently when pagination flags are omitted.
- **Watch for**: new list commands — check if they set pagination defaults consistently.

---

## Low

**ask-genie bypasses ApiClient**
`analyze/ask-genie.ts` makes a direct `fetch()` call to a different service URL, accessing
`this.apiClient.apiKey` directly. Intentional (SSE streaming not supported by ApiClient)
but creates a maintenance risk if ApiClient's header logic changes.
- **Watch for**: new commands that bypass ApiClient for non-standard protocols — they
  should document why.

**Exit code inconsistency**
`requireNumericId` uses `{exit: 2}` (validation) but other validation errors use `{exit: 1}`.
The convention should be: exit 1 for general errors, exit 2 for input validation.
- **Watch for**: new commands using the wrong exit code for validation errors.

---

## Per-agent mapping

| Agent | Relevant pattern sections |
|---|---|
| **Correctness** | Unwrapped JSON.parse, missing requireNumericId, double-parse, empty-body guard, exit codes |
| **Consistency** | Update command validation, pagination defaults, double-parse, exit codes |
| **Security** | ask-genie bypasses ApiClient (direct apiKey access) |
| **Testing** | Missing error path tests for JSON.parse failures, missing requireNumericId test coverage |
