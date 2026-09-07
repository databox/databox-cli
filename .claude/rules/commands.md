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
- Boolean flags: `default: false`.
- Examples use `<%= config.bin %>` template, never hardcoded `databox`. At least 2 examples per command.
- Args use `Args.string({ required: true })` — even numeric IDs are accepted as strings and validated later.

## Output by command type

| Type | Output | Functions |
|---|---|---|
| List | Table + pagination | `formatOutput(data, columns, json)` + `showPagination(pagination, json)` |
| Get / Create / Update | Single record | `formatSingle(data, json)` |
| Delete / Purge / Clear | Confirmation message | `this.log('Resource ID action.')` |
| Set (permissions, timezone) | Confirmation message or single record | `this.log()` or `formatSingle()` |

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
- No try/catch around API calls — errors propagate to oclif's handler.
- No direct `fetch()` calls (exception: `ask-genie.ts` for SSE streaming).

## Update commands

Update commands with optional flags must guard against empty bodies:
```typescript
if (Object.keys(body).length === 0) {
  this.error('Provide at least one field to update (--name or --title).', {exit: 1})
}
```
