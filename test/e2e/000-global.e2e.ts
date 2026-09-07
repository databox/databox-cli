import * as fs from 'node:fs'

import {CLI_ENTRYPOINT, cli, expectOk, retryRead} from './helpers/cli.js'
import {preflight} from './helpers/env.js'
import {sweepOrphans} from './helpers/cleanup.js'
import {pendingRestores, runPendingRestores} from './helpers/restore.js'

/**
 * Top-level hooks in a spec file are mocha root hooks: this `before` runs once
 * before every suite and this `after` once after all of them, whatever order the
 * files load in.
 */

before(async function () {
  this.timeout(120_000)

  preflight()

  if (!fs.existsSync(CLI_ENTRYPOINT)) {
    throw new Error(`CLI entrypoint not found at ${CLI_ENTRYPOINT}. Run "npm run build" first.`)
  }

  // Fail fast and clearly if the target is unreachable or the key is rejected,
  // rather than letting every suite fail with its own variant of the same error.
  // Retried: a single transient auth blip should not kill an entire run.
  await retryRead(
    async () => {
      const result = await cli(['auth', 'validate'])
      if (result.code !== 0) {
        throw new Error(
          `Could not reach the target API or the key was rejected.\n${result.stderr.trim() || result.stdout.trim()}`,
        )
      }

      return expectOk(result)
    },
    {attempts: 3, delayMs: 3000},
  )

  // An interrupted run can leave the account, profile or a connection renamed.
  // Put those back before anything else, so the suites read the real values.
  const outstanding = pendingRestores()
  if (outstanding.length > 0) {
    console.log(`   restore: ${outstanding.length} outstanding change(s) from a previous run`)
    await runPendingRestores()
  }
})

after(async function () {
  this.timeout(300_000)

  // Undo mutations first: a shared resource left renamed matters more than a
  // stray fixture, which the sweeper will collect anyway.
  const {failed: restoreFailed, restored} = await runPendingRestores()
  if (restored > 0 || restoreFailed > 0) {
    console.log(`\n   restore: ${restored} put back, ${restoreFailed} failed`)
  }

  const {deleted, failed} = await sweepOrphans()
  if (deleted > 0 || failed > 0) {
    console.log(`\n   sweep: ${deleted} deleted, ${failed} failed`)
  }
})
