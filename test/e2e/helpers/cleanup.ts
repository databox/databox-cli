/* eslint-disable n/no-process-exit, unicorn/no-process-exit, unicorn/prefer-top-level-await --
   Standalone script (npm run test:e2e:cleanup): the exit code is the contract, and the entry
   point is guarded so the module can still be imported. */
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'

import {
  NO_MANAGED_ACCOUNTS, cli, cliWithRetry, errorText,
} from './cli.js'
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
  /**
   * A listing failure matching this means the organization cannot have the resource at all, so
   * there is nothing to sweep: skipped, not reported as unchecked.
   */
  notApplicable?: RegExp
}

/** How long one sweep listing may take, and how many times a transient failure is retried. */
export interface SweepBudget {
  attempts: number
  timeoutMs: number
}

/**
 * For the root after() hook, whose own timeout is 300s. A timed-out call ends within 40s (its 35s
 * plus cli()'s 5s kill grace), so three listings of 2 attempts and a 3s retry delay each take 249s
 * at worst, leaving room for the restores that run first.
 */
const HOOK_BUDGET: SweepBudget = {attempts: 2, timeoutMs: 35_000}

/** For the standalone cleanup script, which has no hook timeout to fit inside. */
const STANDALONE_BUDGET: SweepBudget = {attempts: 3, timeoutMs: 180_000}

/**
 * Deleting a data source cascades to its datasets, so datasets need no sweep of their own. Only an
 * organization that manages accounts (an agency) has accounts; any other refuses the listing.
 */
const SWEEP_TARGETS: SweepTarget[] = [
  {command: 'data-source', label: 'data sources'},
  {command: 'metric', label: 'metrics'},
  {command: 'account', label: 'accounts', notApplicable: NO_MANAGED_ACCOUNTS},
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
export async function sweepOrphans({attempts, timeoutMs}: SweepBudget = HOOK_BUDGET): Promise<SweepResult> {
  let deleted = 0
  let failed = 0
  const unchecked: string[] = []

  for (const {command, label, notApplicable} of SWEEP_TARGETS) {
    // --all, not one large page: the API clamps page size to 100, so a single page misses
    // every orphan past the first hundred. --search narrows it to the prefix server-side, so a
    // large shared organization is not paged through in full; the name check below still decides.
    // eslint-disable-next-line no-await-in-loop
    const listed = await cliWithRetry([command, 'list', '--search', E2E_PREFIX, '--all', '--json'], {attempts, timeoutMs})

    if (listed.code !== 0 && notApplicable?.test(errorText(listed))) continue

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

  const {deleted, failed, unchecked} = await sweepOrphans(STANDALONE_BUDGET)

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
