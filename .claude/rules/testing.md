---
paths:
  - test/**
---

# Testing Conventions

## Framework

Mocha + Chai (expect style) + `@oclif/test` (`runCommand`). ESM with ts-node loader.

## Test structure

```typescript
import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('domain action', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/resources',
      response: {status: 'success', requestId: 'test', data: { ... }},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('does the thing', async () => {
    const {stdout} = await runCommand(['domain', 'action'], {root: process.cwd()})
    expect(stdout).to.include('expected value')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['domain', 'action', '--json'], {root: process.cwd()})
    const json = JSON.parse(stdout)
    expect(json).to.have.property('expectedKey')
  })
})
```

## Rules

- **File location mirrors source**: `src/commands/dataset/get.ts` → `test/commands/dataset/get.test.ts`
- **Setup/teardown**: `setupTestConfig()` in `beforeEach`, `cleanupTestConfig()` + `restoreApi()` in `afterEach`. Always both.
- **Mock envelope**: Full `{status: 'success', requestId: 'test', data: {...}}` — not just `{data}`.
- **Realistic mocks**: Include all fields the command accesses, not empty objects.
- **runCommand**: Always pass `{root: process.cwd()}`.
- **Destructive commands**: Use `--force` to skip interactive prompts.
- **Coverage per command**: At minimum one happy-path test + one `--json` test.
- **Error paths**: New validation logic (`requireNumericId`, empty-body guard) needs tests asserting the exit code.
- **Naming**: `describe('domain action')` matches the CLI invocation. `it('verbs behavior')`.
