/* eslint-disable n/no-process-exit, unicorn/no-process-exit, unicorn/prefer-top-level-await --
   Standalone script (npm run test:e2e:cleanup): the exit code is the contract, and the entry
   point is guarded so the module can still be imported. */
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

import {cli, cliWithRetry, errorText} from './cli.js'
import {preflight} from './env.js'
import {E2E_PREFIX, isE2eResource} from './resources.js'
import {pendingRestores, runPendingRestores} from './restore.js'

interface NamedResource {
  id: number | string
  name?: null | string
}

interface SweepTarget {
  /** Argv prefix, e.g. ['data-source'] -> `databox data-source list|delete`. */
  command: string
  label: string
}

/** Deleting a data source cascades to its datasets, so datasets need no sweep of their own. */
const SWEEP_TARGETS: SweepTarget[] = [
  {command: 'data-source', label: 'data sources'},
  {command: 'metric', label: 'metrics'},
]

export interface SweepResult {
  deleted: number
  failed: number
  /** Targets whose listing could not be read — so "nothing found" is never confused with "could not look". */
  unchecked: string[]
}

/**
 * Removes anything left behind by an interrupted run. Safe to run at any time —
 * it only touches resources whose name carries the e2e prefix.
 */
export async function sweepOrphans(): Promise<SweepResult> {
  let deleted = 0
  let failed = 0
  const unchecked: string[] = []

  for (const {command, label} of SWEEP_TARGETS) {
    // eslint-disable-next-line no-await-in-loop
    const listed = await cliWithRetry([command, 'list', '--page-size', '200', '--json'])

    if (listed.code !== 0) {
      unchecked.push(label)
      console.log(`   sweep: could not list ${label} — ${errorText(listed)}`)
      continue
    }

    let items: NamedResource[]
    try {
      items = JSON.parse(listed.stdout) as NamedResource[]
    } catch {
      unchecked.push(label)
      console.log(`   sweep: could not parse ${label} listing`)
      continue
    }

    const orphans = items.filter(item => isE2eResource(item.name))

    for (const orphan of orphans) {
      // eslint-disable-next-line no-await-in-loop
      const result = await cli([command, 'delete', String(orphan.id), '--force'])
      if (result.code === 0) {
        deleted++
        console.log(`   sweep: deleted ${command} ${orphan.id} ("${orphan.name}")`)
      } else {
        failed++
        console.log(`   sweep: could not delete ${command} ${orphan.id} (exit ${result.code})`)
      }
    }
  }

  return {deleted, failed, unchecked}
}

async function main(): Promise<void> {
  preflight()

  const outstanding = pendingRestores()
  if (outstanding.length > 0) {
    console.log(`Putting back ${outstanding.length} change(s) to resources the suite does not own\n`)
    const {failed: restoreFailed, restored, skipped} = await runPendingRestores()
    console.log(`\nRestored ${restored}, failed ${restoreFailed}, skipped ${skipped} (recorded elsewhere)\n`)
  }

  console.log(`Sweeping resources named "${E2E_PREFIX}*"\n`)

  const {deleted, failed, unchecked} = await sweepOrphans()

  if (deleted > 0 || failed > 0) {
    console.log(`\nSwept ${deleted} resource(s), ${failed} failure(s).`)
  } else if (unchecked.length === 0) {
    console.log('\nNothing to clean up.')
  }

  if (unchecked.length > 0) {
    console.log(`\nCould not check: ${unchecked.join(', ')}. Re-run once the environment recovers.`)
    process.exit(1)
  }
}

// Run standalone: npm run test:e2e:cleanup
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
