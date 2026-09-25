import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../helpers.js'

/**
 * Metric IDs are opaque strings, so they cannot be held to a shape the way numeric IDs are.
 * What they must not be is a dot-segment: encodeURIComponent leaves "." and ".." alone and
 * the URL parser resolves them, so `metric delete ..` would send DELETE /v2/. Each case must
 * exit 2 before any request — and before delete's confirm() prompt, which is why it runs
 * without --force.
 *
 * As with the numeric sweep, the final test asserts the table still covers every
 * requireMetricId call site.
 */

// An empty or blank ID is rejected too, but only the real binary can show it: runCommand
// reports a blank positional as a missing argument before the command runs.
const INVALID = ['.', '..']

const commands: Array<(id: string) => string[]> = [
  id => ['metric', 'delete', id],
  id => ['metric', 'get', id],
  id => ['metric', 'lineage', id],
  id => ['metric', 'set-verification', id, '--status', 'verified'],
  id => ['metric', 'update', id, '--name', 'x'],
  id => ['metric', 'usages', id],
  id => ['metric', 'verification', id],
]

describe('validation: metric IDs', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  for (const argvFor of commands) {
    for (const id of INVALID) {
      const argv = argvFor(id)

      it(`${argv.slice(0, 2).join(' ')} rejects ${JSON.stringify(id)} without a request`, async () => {
        const {error} = await runCommand(argv, {root: process.cwd()})

        expect(error?.oclif?.exit, `exit code for ${JSON.stringify(argv)}`).to.equal(2)
        expect(error?.message ?? '').to.contain('Metric ID must be a metric key')
        expect(requests()).to.have.length(0)
      })
    }
  }

  it('covers every requireMetricId call site', () => {
    const commandsDir = path.join(process.cwd(), 'src', 'commands')
    const guarded: string[] = []

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.name.endsWith('.ts') && /requireMetricId\(args\./.test(fs.readFileSync(full, 'utf8'))) {
          guarded.push(path.relative(commandsDir, full).replace(/\.ts$/, '').split(path.sep).join(' '))
        }
      }
    }

    walk(commandsDir)

    const covered = new Set(commands.map(argvFor => argvFor('x').slice(0, 2).join(' ')))
    const missing = guarded.filter(c => !covered.has(c))

    expect(missing, `commands validating a metric ID but not covered above: ${missing.join(', ')}`).to.deep.equal([])
  })
})
