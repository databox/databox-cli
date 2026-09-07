import * as fs from 'node:fs'
import * as path from 'node:path'

import {REPO_ROOT, cli, describeResult} from './cli.js'
import {getConfig} from './env.js'

/**
 * Undo log for mutations to resources the suite did not create — the account, the
 * signed-in profile, an existing connection. A `finally` block covers the normal
 * path, but it does not survive Ctrl-C or a machine dying mid-run, and a shared
 * environment left renamed is everyone's problem.
 *
 * So the restoring command is written to disk *before* the mutation and removed
 * only once it has been replayed. Anything still in the file is an outstanding
 * change: the root `after()` hook replays it, and `npm run test:e2e:cleanup`
 * replays whatever an interrupted run left behind.
 */

export interface PendingRestore {
  /** Argv that puts the value back. */
  argv: string[]
  /** Stable id, so re-running a suite overwrites rather than stacks entries. */
  key: string
  recordedAt: string
  /** Which environment it was recorded against — never replay onto another. */
  target: string
}

const RESTORE_FILE = path.join(REPO_ROOT, '.e2e-restore.json')

export function restoreFilePath(): string {
  return RESTORE_FILE
}

function read(): PendingRestore[] {
  try {
    return JSON.parse(fs.readFileSync(RESTORE_FILE, 'utf8')) as PendingRestore[]
  } catch {
    return []
  }
}

function write(entries: PendingRestore[]): void {
  if (entries.length === 0) {
    fs.rmSync(RESTORE_FILE, {force: true})
    return
  }

  fs.writeFileSync(RESTORE_FILE, JSON.stringify(entries, null, 2) + '\n')
}

/** Records how to undo a mutation. Call this BEFORE making it. */
export function rememberRestore(key: string, argv: string[]): void {
  const entries = read().filter((entry) => entry.key !== key)
  entries.push({argv, key, recordedAt: new Date().toISOString(), target: getConfig().environment.baseUrl})
  write(entries)
}

/** Drops a recorded undo, once the value is back. */
export function forgetRestore(key: string): void {
  write(read().filter((entry) => entry.key !== key))
}

export function pendingRestores(): PendingRestore[] {
  return read()
}

/**
 * Replays outstanding undos for the current target. Entries recorded against a
 * different environment are left alone rather than applied to the wrong server.
 */
export async function runPendingRestores(): Promise<{failed: number; restored: number; skipped: number}> {
  const {baseUrl} = getConfig().environment
  const entries = read()
  let failed = 0
  let restored = 0
  let skipped = 0

  for (const entry of entries) {
    if (entry.target !== baseUrl) {
      skipped++
      console.log(`   restore: skipping "${entry.key}" — recorded against ${entry.target}`)
      continue
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await cli(entry.argv)
    if (result.code === 0) {
      restored++
      forgetRestore(entry.key)
      console.log(`   restore: put "${entry.key}" back`)
    } else {
      failed++
      console.log(`   restore: FAILED for "${entry.key}" — rerun npm run test:e2e:cleanup\n${describeResult(result)}`)
    }
  }

  return {failed, restored, skipped}
}

/**
 * Mutates something the suite does not own, with the undo recorded first and
 * replayed after — even if the body throws.
 */
export async function withRestore<T>(key: string, restoreArgv: string[], body: () => Promise<T>): Promise<T> {
  rememberRestore(key, restoreArgv)

  try {
    return await body()
  } finally {
    const result = await cli(restoreArgv)
    if (result.code === 0) {
      forgetRestore(key)
    } else {
      // Leave the entry on disk: the root after() hook and the cleanup script retry it.
      console.log(`   restore: could not put "${key}" back yet, left in ${path.basename(RESTORE_FILE)}`)
    }
  }
}
