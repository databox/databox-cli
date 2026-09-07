import * as fs from 'node:fs'

import {CLI_ENTRYPOINT, cli, expectOk, retryRead} from './helpers/cli.js'
import {preflight} from './helpers/env.js'
import {sweepOrphans} from './helpers/cleanup.js'

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
})

after(async function () {
  this.timeout(300_000)

  const {deleted, failed} = await sweepOrphans()
  if (deleted > 0 || failed > 0) {
    console.log(`\n   sweep: ${deleted} deleted, ${failed} failed`)
  }
})
