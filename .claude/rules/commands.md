---
paths:
  - src/commands/**
  - src/lib/output.ts
---

# Command Conventions

## Structure

Every command extends `BaseCommand<T>` (exception: `auth login` extends `Command` directly).
Static members are ordered alphabetically: `args`, `description`, `examples`, `flags`.

```typescript
// Good
export default class DatasetGet extends BaseCommand<typeof DatasetGet> {
  static args = { ... }
  static description = 'Get details of a specific dataset'
  static examples = [ ... ]
  static flags = { ... }
  async run(): Promise<void> { ... }
}

// Bad — wrong order, missing examples
export default class DatasetGet extends BaseCommand<typeof DatasetGet> {
  static description = '...'
  static flags = { ... }
  static args = { ... }
  async run(): Promise<void> { ... }
}
```

## Flags and arguments

- Flag names: kebab-case (`page-size`, `data-source-id`). Body/query params: camelCase (`pageSize`, `dataSourceId`).
- Use `Flags.string()`, `Flags.integer()`, `Flags.boolean()` — match the data type.
- `required: true` on mandatory flags, `options: [...]` for enums, `exclusive: [...]` for mutual exclusion.
- Shared flags from `src/lib/flags.ts`:
  - `...paginationFlags` (`--page`, `--page-size` max 100, `--all`) on list endpoints; `...dataPaginationFlags` (`--page-size` max 1000) on the row-data endpoints (`dataset data`, `metric drilldown`).
  - `...sortFlags(options)` — pass the sort fields the service validates; `sortFlags()` leaves `--sort-by` free.
  - `...idempotencyFlags` on exactly the routes ingestion-api marks `[IdempotencyFilter]`, sending `{...this.accountHeaders, ...idempotencyHeaders(this.flags)}`.
- Boolean flags: `default: false`.
- Examples use `<%= config.bin %>` template, never hardcoded `databox`. At least 2 examples per command.
- Args use `Args.string({ required: true })` — even numeric IDs are accepted as strings and validated later.

## Output by command type

| Type | Output | Functions |
|---|---|---|
| List | Table + pagination | `formatOutput(data, columns, this.outputFormat)` + `showPagination(pagination, this.outputFormat)` |
| Get / Create / Update | Single record | `formatSingle(data, this.outputFormat)` |
| Delete / Purge / Clear | Confirmation message | `this.log('Resource ID action.')` |
| Set (permissions, timezone) | Confirmation message or single record | `this.log()` or `formatSingle()` |

Always pass `this.outputFormat`, never `this.flags.json`: it also covers `--output json|csv`.

`--json` returns what the endpoint returned:

- A pure `{items}` or `{items, pagination}` list unwraps to a bare array of the items, passed through whole.
- A response whose siblings of `items` carry data returns the whole object: `dataset schema` `{items, primaryKey}`,
  `dataset data` `{items, pagination, schema, lastUpdatedAt}`, `dataset preview-modification` `{items, pagination, schema}`.
  Branch on `this.outputFormat === 'json'` and print it with `formatSingle(response, this.outputFormat)`.
- A mutation that returns the resource (`set-timezone`, `set-sync-frequency`, `set-verification`) prints it with
  `formatSingle` under json and csv, and keeps its confirmation line in table mode.
- Lines that only make sense beside a table (a primary key, a "rows matched" count) are printed in table mode only,
  never in CSV, so the stream stays parseable.

List commands fetch through `fetchPaginated`, which implements `--all` and reports a short result on stderr:

```typescript
const response = await fetchPaginated(this.flags, query, pageQuery =>
  this.apiClient.get<ListResponse>('/v2/resources', pageQuery, this.accountHeaders), warning => this.warn(warning))
```

## Destructive operations

Delete, purge, and clear commands require:
1. `--force` flag with `default: false`
2. `confirm()` from `../../lib/prompt.js` when not forced
3. `this.log('Aborted.')` when user declines
4. Success message: `"Resource ID past-tense."` (e.g., `"Dataset 123 deleted."`)

## Error codes

- `this.error(msg, {exit: 1})` — general errors (missing auth, API failures)
- `this.error(msg, {exit: 2})` — input validation errors (`requireNumericId`)

## API calls

- Always pass `this.accountHeaders` as the last argument to `apiClient.get/post/patch/put/delete`.
- No try/catch around API calls — errors propagate to `BaseCommand.catch`, which prints their detail and sets the exit code.
- No direct `fetch()` calls (exception: `ask-genie.ts` for SSE streaming).

## Update commands

Update commands with optional flags must guard against empty bodies:
```typescript
if (Object.keys(body).length === 0) {
  this.error('Provide at least one field to update (--name or --title).', {exit: 1})
}
```
