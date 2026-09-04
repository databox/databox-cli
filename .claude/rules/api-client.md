---
paths:
  - src/lib/api-client.ts
  - src/base-command.ts
---

# API Client Contract

## BaseCommand

`BaseCommand<T>` provides:
- `apiClient` getter — lazy-creates `ApiClient` from config or flag overrides. Errors with exit 1 if no key.
- `requireNumericId(value, name)` — validates string is all digits, errors with exit 2.
- `accountHeaders` getter — returns `{'x-account-id': id}` if `--account-id` set, else `{}`.
- Base flags: `--json`, `--api-key` (hidden), `--api-url` (hidden), `--account-id` (hidden).

`auth login` extends `Command` directly (not `BaseCommand`) because it works without an existing API key.

## ApiClient

- Wraps native `fetch()` — no external HTTP dependencies.
- Methods: `get<T>`, `post<T>`, `patch<T>`, `put<T>`, `delete<T>` — all generic.
- Unwraps V2 envelope: returns `response.data`, not the full `{data, requestId, status}`.
- Auth: `x-api-key` header on every request. Content-Type set only when body is present.
- Errors: parses `errors[]` from response, throws `ApiRequestError(message, statusCode, errors)`.
- Network errors: rethrown as `'Could not connect to API. Check your internet connection.'`

## Rules

- Never add external HTTP dependencies (axios, got, node-fetch) — use native `fetch()`.
- Never expose `ApiRequestError` internals (statusCode, raw error array) to the user beyond the message.
- Never bypass `ApiClient` for API calls unless the protocol requires it (SSE streaming).
- The `apiKey` property must not appear in any `this.log()`, `console.log()`, or error output.
