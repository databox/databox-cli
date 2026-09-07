import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {cleanupTestConfig, setupTestConfig} from '../helpers.js'

/**
 * An update command whose fields are all optional must refuse to send an empty PATCH,
 * and say which flags it wanted. Per .claude/rules/commands.md this is exit 1 (a
 * general error), not exit 2 — these commands are well-formed, they just have nothing
 * to do.
 *
 * As with the other sweeps, the final test asserts the table still covers every
 * guarded command.
 */

const cases: string[][] = [
  ['account', 'update'],
  ['client', 'update', '1'],
  ['connection', 'update', '1'],
  ['dataset', 'set-metadata', '1'],
  ['dataset', 'update', '1'],
  ['metric', 'update', '42|q'],
  ['profile', 'update'],
  ['user', 'update', '1'],
]

describe('validation: empty update bodies', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    cleanupTestConfig()
  })

  for (const argv of cases) {
    it(`${argv.slice(0, 2).join(' ')} refuses an empty body`, async () => {
      const {error} = await runCommand(argv, {root: process.cwd()})

      expect(error?.oclif?.exit, `exit code for "${argv.join(' ')}"`).to.equal(1)
      expect(error?.message ?? '', `message for "${argv.join(' ')}"`).to.match(/at least one field/i)
    })
  }

  it('covers every empty-body guard', () => {
    const commandsDir = path.join(process.cwd(), 'src', 'commands')
    const guarded: string[] = []

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.name.endsWith('.ts') && fs.readFileSync(full, 'utf8').includes('at least one field')) {
          guarded.push(path.relative(commandsDir, full).replace(/\.ts$/, '').split(path.sep).join(' '))
        }
      }
    }

    walk(commandsDir)

    const covered = new Set(cases.map((argv) => argv.slice(0, 2).join(' ')))
    const missing = guarded.filter((c) => !covered.has(c))

    expect(missing, `commands guarding an empty body but not covered above: ${missing.join(', ')}`).to.deep.equal([])
  })
})
