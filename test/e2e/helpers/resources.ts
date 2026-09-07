import {CliResult, cli, cliWithRetry, expectField, json, sleep} from './cli.js'

/**
 * Every resource this suite creates carries this prefix. It is deliberately
 * distinct from the ingestion-api scripts' prefixes ("Test DS", "V2 Test ...")
 * so the two suites can run against the same environment without sweeping each
 * other's resources.
 */
export const E2E_PREFIX = 'cli-e2e-'

export interface SchemaColumn {
  columnId: string
  dataType: 'datetime' | 'number' | 'string'
}

/** Mirrors DEFAULT_SCHEMA in ingestion-api's ExternalTests/v2/v2-test-helper.js. */
export const DEFAULT_SCHEMA: SchemaColumn[] = [
  {columnId: 'id', dataType: 'number'},
  {columnId: 'name', dataType: 'string'},
  {columnId: 'date', dataType: 'datetime'},
  {columnId: 'amount', dataType: 'number'},
]

export const DEFAULT_RECORDS = [
  {amount: 100.5, date: new Date().toISOString(), id: 1, name: 'Alice'},
  {amount: 200.75, date: new Date().toISOString(), id: 2, name: 'Bob'},
  {amount: 50, date: new Date().toISOString(), id: 3, name: 'Charlie'},
]

/** Unique per call, so parallel or repeated runs never collide. */
export function e2eName(label: string): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${E2E_PREFIX}${label}-${Date.now()}-${suffix}`
}

export function isE2eResource(name: unknown): boolean {
  return typeof name === 'string' && name.startsWith(E2E_PREFIX)
}

type TrackedKind = 'client' | 'data-source' | 'dataset' | 'metric' | 'user'

interface TrackedResource {
  id: string
  kind: TrackedKind
}

/**
 * Records what a suite created so its `after()` can remove it. Deletion runs in
 * reverse order, so a dataset is removed before the data source it belongs to.
 */
export class ResourceTracker {
  private readonly resources: TrackedResource[] = []

  track(kind: TrackedKind, id: number | string): string {
    const value = String(id)
    this.resources.push({id: value, kind})
    return value
  }

  /** Marks a resource as already gone — for happy-path tests that delete their own fixture. */
  forget(kind: TrackedKind, id: number | string): void {
    const value = String(id)
    const index = this.resources.findIndex((r) => r.kind === kind && r.id === value)
    if (index !== -1) this.resources.splice(index, 1)
  }

  /** Best effort: a failed teardown is reported, never thrown — it would mask the real failure. */
  async teardown(): Promise<void> {
    for (const {id, kind} of [...this.resources].reverse()) {
      // eslint-disable-next-line no-await-in-loop
      const result = await cli([kind, 'delete', id, '--force'])
      if (result.code !== 0) {
        console.log(`   teardown: could not delete ${kind} ${id} (exit ${result.code})`)
      }
    }

    this.resources.length = 0
  }
}

export async function createDataSource(tracker: ResourceTracker, label = 'ds'): Promise<{id: string; name: string}> {
  const name = e2eName(label)
  const created = json<{id: number; name: string}>(
    await cliWithRetry(['data-source', 'create', '--name', name, '--json']),
  )

  expectField(created, 'id', 'number')
  return {id: tracker.track('data-source', created.id), name}
}

export async function createDataset(
  tracker: ResourceTracker,
  dataSourceId: string,
  options: {label?: string; primaryKey?: string[]; schema?: SchemaColumn[]} = {},
): Promise<{id: string; name: string}> {
  const {label = 'dataset', schema = DEFAULT_SCHEMA} = options
  const primaryKey = options.primaryKey ?? [schema[0].columnId]
  const name = e2eName(label)

  const argv = [
    'dataset',
    'create',
    '--name',
    name,
    '--data-source-id',
    dataSourceId,
    '--schema',
    JSON.stringify(schema),
    '--json',
  ]
  for (const key of primaryKey) argv.push('--primary-key', key)

  const created = json<{id: number; name: string}>(await cliWithRetry(argv))

  expectField(created, 'id', 'number')
  return {id: tracker.track('dataset', created.id), name}
}

export async function ingestRecords(datasetId: string, records: unknown[] = DEFAULT_RECORDS): Promise<string> {
  const response = json<{ingestionId: string}>(
    await cli(['dataset', 'ingest', datasetId, '--records', JSON.stringify(records), '--json']),
  )

  expectField(response, 'ingestionId', 'string')
  return response.ingestionId
}

/** Non-throwing ingest, so a suite can skip cleanly when the ingestion pipeline is down. */
export async function tryIngestRecords(
  datasetId: string,
  records: unknown[] = DEFAULT_RECORDS,
): Promise<CliResult> {
  return cli(['dataset', 'ingest', datasetId, '--records', JSON.stringify(records), '--json'])
}

/**
 * Ingestion is asynchronous. Polls for a terminal state and reports rather than
 * fails on timeout — a slow environment is not a CLI defect.
 */
export async function waitForIngestion(
  datasetId: string,
  ingestionId: string,
  {attempts = 20, delayMs = 3000}: {attempts?: number; delayMs?: number} = {},
): Promise<Record<string, unknown> | undefined> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    const result = await cli(['dataset', 'ingestion', datasetId, ingestionId, '--json'])

    if (result.code === 0) {
      const ingestion = JSON.parse(result.stdout) as Record<string, unknown>
      const status = String(ingestion.status ?? '').toLowerCase()
      if (status && !['inprogress', 'in_progress', 'pending', 'processing', 'queued', 'running'].includes(status)) {
        return ingestion
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(delayMs)
  }

  console.log(`   note: ingestion ${ingestionId} did not reach a terminal state within the poll window`)
  return undefined
}
