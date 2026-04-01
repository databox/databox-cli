# ENV Variable Configuration Support

## Summary

Add `DATABOX_API_KEY` environment variable support so the CLI works without a config file, enabling CI/CD pipeline usage.

## Motivation

CI/CD pipelines inject secrets as environment variables. The CLI currently requires `auth login` to write a config file before use. This makes automation awkward. With ENV var support, a pipeline can set `DATABOX_API_KEY` and run commands directly.

## Design

### Precedence Order

`--api-key` flag > `DATABOX_API_KEY` env var > config file (`~/.config/databox-cli/config.json`)

This matches the existing `--api-url` / `DATABOX_API_URL` pattern and is the industry standard (oclif, Docker, Terraform all use this order).

### Changes

**`src/base-command.ts`:**
- Add a hidden `--api-key` base flag with `env: 'DATABOX_API_KEY'`
- Update the `apiClient` getter to check `this.flags['api-key']` before falling back to `config.apiKey`
- When API key comes from flag/ENV, skip the config file error if no config file exists

### ENV Variables (Complete List)

| Variable | Purpose | Existing? |
|----------|---------|-----------|
| `DATABOX_API_KEY` | API authentication key | **New** |
| `DATABOX_API_URL` | Override API base URL | Existing |
| `DATABOX_AGENTIC_SERVICE_URL` | Override Genie AI service URL | Existing |

### What Stays the Same

- `auth login` still writes to config file for interactive use
- `config.ts` is unchanged — ENV support is handled at the flag/command level
- Existing `DATABOX_API_URL` and `DATABOX_AGENTIC_SERVICE_URL` behavior unchanged

### Concurrency

ENV vars are per-process. Multiple CI jobs running in parallel with different `DATABOX_API_KEY` values are inherently isolated — no shared state, no config file contention.

### CI/CD Usage Example

```bash
export DATABOX_API_KEY=xxx
# optionally:
export DATABOX_API_URL=https://custom.api.com

databox dataset list        # works without auth login
databox analyze ask-genie DATASET_ID "question"
```

## Testing

- Verify CLI works with `DATABOX_API_KEY` env var set and no config file present
- Verify flag `--api-key` overrides ENV var
- Verify ENV var overrides config file value
- Verify existing behavior unchanged when no ENV var is set
