---
paths:
  - src/**
---

# Security Rules

## API key handling

- `apiClient.apiKey` must never appear in `this.log()`, `console.log()`, or error messages.
- The only legitimate direct access to `apiKey` is in `ask-genie.ts` for the SSE `x-api-key` header.
- Hidden flags (`--api-key`, `--api-url`, `--account-id`) must remain `hidden: true` — they do not appear in help output.

## Config file

- Config lives at `~/.config/databox-cli/config.json` with `apiKey` and optional `apiUrl`.
- Never log config file contents. Never weaken file permissions.

## URL interpolation

- User-provided IDs are interpolated into API paths: `/v2/datasets/${args.datasetId}`.
- Dataset commands validate with `requireNumericId()` (digits only — safe).
- Other commands do not validate — a malicious ID could produce unexpected API paths.
- New commands that interpolate user input into URL paths should validate the input.

```typescript
// Safe — validated
this.requireNumericId(args.datasetId, 'Dataset ID')
const response = await this.apiClient.get(`/v2/datasets/${args.datasetId}`, ...)

// Risk — unvalidated
const response = await this.apiClient.get(`/v2/connections/${args.connectionId}`, ...)
```

## Input handling

- `JSON.parse()` on user-provided flag values (--schema, --records, --data) must be wrapped in try/catch with a user-friendly error message. A bare `JSON.parse` leaks a raw `SyntaxError`.
- `fs.readFileSync` on user-provided paths (--file flag) should check file existence first.
- No unbounded stdin reads without size limits in new commands.

## Error messages

- Do not include request headers, full URLs, or API keys in error output.
- `ApiRequestError` messages are displayed to the user — they come from the server and are acceptable.
