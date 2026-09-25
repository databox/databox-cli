---
paths:
  - src/lib/api-client.ts
  - src/base-command.ts
---

# API Client Contract

## BaseCommand

`BaseCommand<T>` provides:
- `apiClient` — built in `init()` from config or flag overrides, so a missing key or unreadable config fails (exit 1) before `run()` and before any confirmation prompt.
- `requireNumericId(value, name)` — validates string is all digits, errors with exit 2.
- `requireUuid(value, name)` — validates a UUID, errors with exit 2. `init()` applies it to `--idempotency-key` before `run()`.
- `requireMetricId(value, name)` — metric keys are opaque strings, so it rejects only what would rewrite the path: empty, blank, `.` and `..` (exit 2). Pair it with `encodeURIComponent`.
- `accountHeaders` getter — returns `{'x-account-id': id}` if `--account-id` set, else `{}`. `init()` validates `--account-id` as numeric first.
- `outputFormat` getter — `'table' | 'json' | 'csv'`; `--json` resolves to `'json'`.
- `color` getter — false under `--no-color` or a non-empty `NO_COLOR`. The CLI's own output has no colour; any colour added must check it.
- `catch()` — renders `ApiRequestError` via `describeApiError` (exit 1) and `ApiConnectionError` (exit 2) before oclif's handler prints them.
- Base flags: `--output table|json|csv` (default `table`), `--json` (shorthand, exclusive with `--output`), `--verbose`, `--no-color`, `--api-key` (hidden), `--api-url` (hidden), `--account-id` (hidden).

`auth login` extends `Command` directly (not `BaseCommand`) because it works without an existing API key.

## ApiClient

- Wraps native `fetch()` — no external HTTP dependencies.
- Methods: `get<T>`, `post<T>`, `patch<T>`, `put<T>`, `delete<T>` — all generic.
- Unwraps V2 envelope: returns `response.data`, not the full `{data, requestId, status}`.
- Auth: `x-api-key` header on every request. Content-Type set only when body is present.
- Errors: parses `errors[]` from the error envelope, throws `ApiRequestError(message, status, errors, requestId)`.
  `code`, `field` and `type` are taken from the first error. A non-JSON or `null` body falls back to `API error: <status> <statusText>`.
- Transport failures — `fetch()` rejecting, a timeout, or the body stream failing mid-read — throw `ApiConnectionError` (exit 2).
- `--verbose`: the `trace` option receives lines built only by `describeRequest(method, url)` and
  `describeResponse(status, ms, requestId)`. Neither takes the headers, so the key is never in scope;
  the header line is the literal `Headers: x-api-key: <redacted>`. Trace goes to stderr.

## Rules

- Never add external HTTP dependencies (axios, got, node-fetch) — use native `fetch()`.
- API error detail (code, message, field, request ID) is printed by `BaseCommand.catch` in the cli.md §8 layout. Commands must not catch API errors themselves — that loses the detail and the exit code.
  - The one sanctioned exception: a command may override `catch()` to append a hint to one specific API error code.
    It re-renders that error with `describeApiError(error)` plus the hint line, passes it to `super.catch` as a
    `CLIError` with exit 1, and delegates every other error to `super.catch` unchanged. No try/catch goes around the
    API call itself. See `src/commands/user/invite.ts` (`duplicate_record` → a pointer to `user update`).
- Never pass headers, or anything holding the key, into a trace or log line. Build such lines from explicit printable values.
- Never bypass `ApiClient` for API calls unless the protocol requires it (SSE streaming).
- The `apiKey` property must not appear in any `this.log()`, `console.log()`, or error output.
