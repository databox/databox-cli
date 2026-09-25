import {expect} from 'chai'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import {
  cli, errorText, expectExit, expectNoKey, expectOk, json, skipWith,
} from './helpers/cli.js'
import {parseCsv} from './helpers/csv.js'
import {getConfig} from './helpers/env.js'
import {
  DEFAULT_RECORDS, ResourceTracker, createDataSource, createDataset,
} from './helpers/resources.js'

/**
 * The contract that is uniquely the CLI's — exit codes, stream discipline, output
 * shape, credential hygiene. None of this has a counterpart in the ingestion-api
 * suite, and none of it is reachable without running the real binary.
 */
describe('cli-contract', () => {
  const tracker = new ResourceTracker()
  let datasetId: string

  before(async function () {
    this.timeout(120_000)

    const dataSource = await createDataSource(tracker, 'contract-src')
    const dataset = await createDataset(tracker, dataSource.id, {label: 'contract'})
    datasetId = dataset.id
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  describe('exit codes', () => {
    it('exits 0 on success', async () => {
      expectOk(await cli(['organization', 'info', '--json']))
    })

    it('exits 2 for input validation', async () => {
      expectExit(await cli(['dataset', 'get', 'not-numeric']), 2)
      expectExit(await cli(['data-source', 'get', '12.5']), 2)
      expectExit(await cli(['dataset', 'ingest', 'abc', '--records', '[]']), 2)
    })

    it('exits 1 when unauthenticated', async () => {
      const result = await cli(['organization', 'info'], {withoutCredentials: true})

      expectExit(result, 1)
      expect(result.stderr).to.include('databox auth login')
    })

    it('exits non-zero for an unknown command', async () => {
      const result = await cli(['nonesuch', 'command'])
      expect(result.code).to.not.equal(0)
    })

    it('exits non-zero for an unknown flag', async () => {
      const result = await cli(['organization', 'info', '--not-a-flag'])
      expect(result.code).to.not.equal(0)
    })

    it('exits non-zero when a required flag is missing', async () => {
      const result = await cli(['data-source', 'create'])

      expect(result.code).to.not.equal(0)
      expect(result.stderr).to.match(/name/i)
    })
  })

  describe('output discipline', () => {
    it('puts only JSON on stdout under --json', async () => {
      for (const argv of [
        ['organization', 'info', '--json'],
        ['data-source', 'list', '--page-size', '3', '--json'],
        ['integration', 'list', '--page-size', '3', '--json'],
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const result = expectOk(await cli(argv))
        expect(() => JSON.parse(result.stdout), `stdout of "${argv.join(' ')}" was not pure JSON`).to.not.throw()
      }
    })

    it('suppresses the pagination line under --json', async () => {
      const table = expectOk(await cli(['data-source', 'list', '--page-size', '3']))
      const asJson = expectOk(await cli(['data-source', 'list', '--page-size', '3', '--json']))

      expect(table.stdout).to.match(/Page \d+ of \d+/)
      expect(asJson.stdout).to.not.match(/Page \d+ of \d+/)
    })

    it('renders a table with headers and a rule when --json is absent', async () => {
      const result = expectOk(await cli(['integration', 'list', '--page-size', '3']))

      expect(result.stdout).to.include('Name')
      expect(result.stdout).to.include('│')
      expect(result.stdout).to.include('─')
    })

    it('prints "No results found." for an empty table', async () => {
      // A freshly created data source has no datasets, so this listing is reliably empty.
      const empty = await createDataSource(tracker, 'empty')
      const result = expectOk(await cli(['data-source', 'datasets', empty.id]))

      expect(result.stdout).to.include('No results found.')
    })

    it('writes errors to stderr, leaving stdout clean', async () => {
      const result = await cli(['dataset', 'get', 'not-numeric'])

      expect(result.stderr).to.not.be.empty
      expect(result.stdout.trim()).to.be.empty
    })
  })

  describe('global flags', () => {
    it('prints CSV under --output csv: a header, one line per row, no table rule or footer', async () => {
      const result = expectOk(await cli(['integration', 'list', '--page-size', '3', '--output', 'csv']))
      const rows = parseCsv(result.stdout.trimEnd())

      expect(rows[0]).to.deep.equal(['ID', 'Key', 'Name', 'Datasets'])
      expect(rows.length, 'a header plus up to three rows').to.be.within(1, 4)
      for (const row of rows) expect(row).to.have.lengthOf(4)

      expect(result.stdout).to.not.include('│')
      expect(result.stdout).to.not.match(/Page \d+ of \d+/)
    })

    it('traces requests to stderr under --verbose, leaving stdout parseable and the key unprinted', async () => {
      const result = await cli(['organization', 'info', '--json', '--verbose'])

      expect(() => JSON.parse(result.stdout), 'stdout under --verbose was not pure JSON').to.not.throw()
      expect(result.stderr).to.match(/Request: GET https?:\/\/\S+\/v2\/organization\b/)
      expect(result.stderr).to.include('Headers: x-api-key: <redacted>')
      expect(result.stderr).to.match(/Response: 200 \(\d+ms\)/)
      expect(result.stdout).to.not.match(/Request: |Response: /)

      expectNoKey(result)
    })

    // Port 9 (discard) is closed on a loopback that runs no such service, so the connection is
    // refused at once. A failure to reach the API is exit 2; an API error would be exit 1.
    it('exits 2 when the API cannot be reached', async () => {
      const result = await cli(['organization', 'info', '--api-url', 'http://127.0.0.1:9'])

      expectExit(result, 2)
      expect(errorText(result)).to.match(/could not connect to api/i)
    })

    it('fetches every page under --all', async function () {
      this.timeout(120_000)

      // The catalog changes rarely, so its total is stable between two reads.
      const footer = expectOk(await cli(['integration', 'list', '--page-size', '1'])).stdout.match(/\((\d+) total items\)/)
      expect(footer, 'the table footer should report the total').to.not.equal(null)
      const total = Number(footer![1])

      const all = await cli(['integration', 'list', '--all', '--json'])
      const items = json<Array<{key: string}>>(all)

      // Key, not id: IntegrationListItem.Id is `model.Id ?? 0`, and production lists several
      // integrations (Make, Zapier) whose upstream id is null, so they all read as 0.
      expect(items).to.have.lengthOf(total)
      expect(new Set(items.map(item => item.key)).size, 'no integration should be listed twice').to.equal(total)
      expect(all.stderr, 'a complete fetch prints no warning').to.not.match(/Fetched \d+/)
    })
  })

  describe('credential hygiene', () => {
    it('never prints the API key, on success or failure', async () => {
      const runs = [
        await cli(['organization', 'info']),
        await cli(['organization', 'info', '--json']),
        await cli(['dataset', 'get', 'not-numeric']),
        await cli(['nonesuch']),
        await cli(['organization', 'info'], {env: {DATABOX_API_KEY: 'pak_bad-key-value'}}),
      ]

      for (const result of runs) expectNoKey(result)
    })

    it('keeps --api-key, --api-url and --account-id out of help output', async () => {
      const result = expectOk(await cli(['organization', 'info', '--help']))

      expect(result.stdout).to.not.include('--api-key')
      expect(result.stdout).to.not.include('--api-url')
      expect(result.stdout).to.not.include('--account-id')
    })
  })

  describe('help and version', () => {
    it('exits 0 for --help and -h', async () => {
      expect(expectOk(await cli(['--help'])).stdout).to.not.be.empty
      expect(expectOk(await cli(['dataset', 'list', '-h'])).stdout).to.include('dataset list')
    })

    it('exits 0 for --version and -v', async () => {
      expect(expectOk(await cli(['--version'])).stdout).to.include('databox-cli')
      expect(expectOk(await cli(['-v'])).stdout).to.not.be.empty
    })
  })

  describe('dataset ingest input modes', () => {
    it('accepts records inline via --records', async function () {
      const result = await cli(['dataset', 'ingest', datasetId, '--records', JSON.stringify(DEFAULT_RECORDS), '--json'])

      if (result.code !== 0 && /upstream service error/i.test(errorText(result))) {
        skipWith(this, 'ingestion pipeline unavailable on this environment')
      }

      expectOk(result)
    })

    it('accepts records from a file via --file', async function () {
      const file = path.join(os.tmpdir(), `cli-e2e-records-${Date.now()}.json`)
      fs.writeFileSync(file, JSON.stringify(DEFAULT_RECORDS))

      try {
        const result = await cli(['dataset', 'ingest', datasetId, '--file', file, '--json'])

        if (result.code !== 0 && /upstream service error/i.test(errorText(result))) {
          skipWith(this, 'ingestion pipeline unavailable on this environment')
        }

        expectOk(result)
      } finally {
        fs.rmSync(file, {force: true})
      }
    })

    it('accepts records piped on stdin', async function () {
      const result = await cli(['dataset', 'ingest', datasetId, '--json'], {stdin: JSON.stringify(DEFAULT_RECORDS)})

      if (result.code !== 0 && /upstream service error/i.test(errorText(result))) {
        skipWith(this, 'ingestion pipeline unavailable on this environment')
      }

      expectOk(result)
    })

    it('exits 2 for a missing --file', async () => {
      const result = await cli(['dataset', 'ingest', datasetId, '--file', '/no/such/file.json'])

      expectExit(result, 2)
      expect(result.stderr).to.include('File not found')
    })

    it('rejects --records and --file together', async () => {
      const result = await cli(['dataset', 'ingest', datasetId, '--records', '[]', '--file', 'x.json'])
      expect(result.code).to.not.equal(0)
    })

    // Documents a real quirk: src/commands/dataset/ingest.ts falls into the stdin
    // branch whenever !process.stdin.isTTY. Spawned (and in CI) stdin is never a TTY,
    // so omitting every input flag reads an empty stdin and fails as invalid JSON with
    // exit 2 — the intended exit 1 "Provide data via --records, --file, or stdin pipe."
    // is unreachable outside an interactive terminal.
    it('exits 2, not 1, when no input is given off a TTY', async () => {
      const result = await cli(['dataset', 'ingest', datasetId])

      expectExit(result, 2)
      expect(result.stderr).to.include('stdin')
    })
  })

  describe('configuration precedence', () => {
    it('honours DATABOX_API_KEY over any stored config', async () => {
      const result = await cli(['auth', 'validate'], {env: {DATABOX_API_KEY: 'pak_definitely-invalid'}})
      expectExit(result, 1)
    })

    it('does not read or write the user config file', async () => {
      const configFile = path.join(os.homedir(), '.config', 'databox-cli', 'config.json')
      const before = fs.existsSync(configFile) ? fs.statSync(configFile).mtimeMs : null

      expectOk(await cli(['organization', 'info', '--json']))

      const after = fs.existsSync(configFile) ? fs.statSync(configFile).mtimeMs : null
      expect(after).to.equal(before)
    })

    it('sends x-account-id when --account-id is set', async function () {
      const {accountId} = getConfig()
      if (!accountId) skipWith(this, 'DATABOX_E2E_ACCOUNT_ID is not set, so there is no account to scope to')

      // /v2/organization answers for the context space, so with x-account-id it is that account.
      const scoped = json<{id: number}>(await cli(['organization', 'info', '--account-id', accountId!, '--json']))
      expect(String(scoped.id)).to.equal(accountId)
    })
  })
})
