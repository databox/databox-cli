import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {cleanupTestConfig, setupTestConfig} from '../helpers.js'

/**
 * Every command that interpolates a resource ID into a URL path must reject a
 * non-numeric one with exit 2, rather than letting it through to produce a confusing
 * API 404 — or, worse, a path rewritten by `../`.
 *
 * The table is the `requireNumericId(args.X)` call sites, with the validated argument
 * set to a non-numeric value and any other positional filled in. The final test
 * asserts the table still covers every call site, so adding a command without a case
 * here fails rather than silently going untested.
 */

const INVALID = 'not-a-number'

const cases: string[][] = [
  ['client', 'delete', 'not-a-number'],
  ['client', 'get', 'not-a-number'],
  ['client', 'update', 'not-a-number'],
  ['connection', 'delete', 'not-a-number'],
  ['connection', 'get', 'not-a-number'],
  ['connection', 'permissions', 'not-a-number'],
  ['connection', 'set-permissions', 'not-a-number', '--access-level', 'everyone'],
  ['connection', 'update', 'not-a-number'],
  ['data-source', 'datasets', 'not-a-number'],
  ['data-source', 'delete', 'not-a-number'],
  ['data-source', 'get', 'not-a-number'],
  ['data-source', 'permissions', 'not-a-number'],
  ['data-source', 'purge', 'not-a-number'],
  ['data-source', 'set-permissions', 'not-a-number', '--access-level', 'everyone'],
  ['data-source', 'set-sync-frequency', 'not-a-number', '--interval', '1'],
  ['data-source', 'set-timezone', 'not-a-number', '--timezone', 'x'],
  ['data-source', 'sync-frequencies', 'not-a-number'],
  ['data-source', 'update', 'not-a-number', '--name', 'x'],
  ['databoard', 'metrics', 'not-a-number'],
  ['dataset', 'add-modification', 'not-a-number', '--data', '{}'],
  ['dataset', 'clear-modifications', 'not-a-number'],
  ['dataset', 'column-metadata', 'not-a-number'],
  ['dataset', 'data', 'not-a-number'],
  ['dataset', 'delete', 'not-a-number'],
  ['dataset', 'duplicate', 'not-a-number'],
  ['dataset', 'get', 'not-a-number'],
  ['dataset', 'ingest', 'not-a-number'],
  ['dataset', 'ingestion-statistics', 'not-a-number'],
  ['dataset', 'ingestion', 'not-a-number', '3c63e510-276f-4541-9c66-8c00161fda82'],
  ['dataset', 'ingestions', 'not-a-number'],
  ['dataset', 'lineage', 'not-a-number'],
  ['dataset', 'metadata', 'not-a-number'],
  ['dataset', 'modifications', 'not-a-number'],
  ['dataset', 'permissions', 'not-a-number'],
  ['dataset', 'preview-modification', 'not-a-number', '--data', '{}'],
  ['dataset', 'purge', 'not-a-number'],
  ['dataset', 'schema', 'not-a-number'],
  ['dataset', 'set-column-metadata', 'not-a-number', '--columns', '{}'],
  ['dataset', 'set-metadata', 'not-a-number'],
  ['dataset', 'set-permissions', 'not-a-number', '--access-level', 'everyone'],
  ['dataset', 'set-sync-frequency', 'not-a-number', '--interval', '1'],
  ['dataset', 'set-timezone', 'not-a-number', '--timezone', 'x'],
  ['dataset', 'set-verification', 'not-a-number', '--status', 'verified'],
  ['dataset', 'sync-frequencies', 'not-a-number'],
  ['dataset', 'sync-history', 'not-a-number'],
  ['dataset', 'sync-statistics', 'not-a-number'],
  ['dataset', 'update-modification', 'not-a-number', '--data', '{}'],
  ['dataset', 'update', 'not-a-number'],
  ['dataset', 'verification', 'not-a-number'],
  ['integration', 'get', 'not-a-number'],
  ['user', 'delete', 'not-a-number'],
  ['user', 'get', 'not-a-number'],
  ['user', 'update', 'not-a-number'],
]

describe('validation: non-numeric resource IDs', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    cleanupTestConfig()
  })

  for (const argv of cases) {
    it(`${argv.filter((a) => !a.startsWith('-')).slice(0, 2).join(' ')} rejects ${INVALID}`, async () => {
      // No --force needed: requireNumericId runs before any confirm() prompt.
      const {error} = await runCommand(argv, {root: process.cwd()})

      expect(error?.oclif?.exit, `exit code for "${argv.join(' ')}"`).to.equal(2)
      expect(error?.message ?? '').to.match(/must be a numeric value/i)
    })
  }

  it('covers every requireNumericId call site', () => {
    const commandsDir = path.join(process.cwd(), 'src', 'commands')
    const guarded: string[] = []

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.name.endsWith('.ts')) {
          if (/requireNumericId\(args\./.test(fs.readFileSync(full, 'utf8'))) {
            guarded.push(path.relative(commandsDir, full).replace(/\.ts$/, '').split(path.sep).join(' '))
          }
        }
      }
    }

    walk(commandsDir)

    const covered = new Set(cases.map((argv) => argv.filter((a) => !a.startsWith('-')).slice(0, 2).join(' ')))
    const missing = guarded.filter((c) => !covered.has(c))

    expect(missing, `commands validating an ID but not covered above: ${missing.join(', ')}`).to.deep.equal([])
  })
})
