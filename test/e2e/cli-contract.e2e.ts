import {expect} from 'chai'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import {cli, errorText, expectExit, expectOk, json} from './helpers/cli.js'
import {getConfig} from './helpers/env.js'
import {DEFAULT_RECORDS, ResourceTracker, createDataSource, createDataset} from './helpers/resources.js'

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
      expectOk(await cli(['account', 'info', '--json']))
    })

    it('exits 2 for input validation', async () => {
      expectExit(await cli(['dataset', 'get', 'not-numeric']), 2)
      expectExit(await cli(['data-source', 'get', '12.5']), 2)
      expectExit(await cli(['dataset', 'ingest', 'abc', '--records', '[]']), 2)
    })

    it('exits 1 when unauthenticated', async () => {
      const result = await cli(['account', 'info'], {withoutCredentials: true})

      expectExit(result, 1)
      expect(result.stderr).to.include('databox auth login')
    })

    it('exits non-zero for an unknown command', async () => {
      const result = await cli(['nonesuch', 'command'])
      expect(result.code).to.not.equal(0)
    })

    it('exits non-zero for an unknown flag', async () => {
      const result = await cli(['account', 'info', '--not-a-flag'])
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
        ['account', 'info', '--json'],
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

  describe('credential hygiene', () => {
    it('never prints the API key, on success or failure', async () => {
      const {apiKey} = getConfig().environment

      const runs = [
        await cli(['account', 'info']),
        await cli(['account', 'info', '--json']),
        await cli(['dataset', 'get', 'not-numeric']),
        await cli(['nonesuch']),
        await cli(['account', 'info'], {env: {DATABOX_API_KEY: 'pak_bad-key-value'}}),
      ]

      for (const result of runs) {
        expect(result.stdout, `stdout of "${result.argv.join(' ')}"`).to.not.include(apiKey)
        expect(result.stderr, `stderr of "${result.argv.join(' ')}"`).to.not.include(apiKey)
      }
    })

    it('keeps --api-key, --api-url and --account-id out of help output', async () => {
      const result = expectOk(await cli(['account', 'info', '--help']))

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
        console.log('   skip: ingestion pipeline unavailable on this environment')
        this.skip()
      }

      expectOk(result)
    })

    it('accepts records from a file via --file', async function () {
      const file = path.join(os.tmpdir(), `cli-e2e-records-${Date.now()}.json`)
      fs.writeFileSync(file, JSON.stringify(DEFAULT_RECORDS))

      try {
        const result = await cli(['dataset', 'ingest', datasetId, '--file', file, '--json'])

        if (result.code !== 0 && /upstream service error/i.test(errorText(result))) {
          console.log('   skip: ingestion pipeline unavailable on this environment')
          this.skip()
        }

        expectOk(result)
      } finally {
        fs.rmSync(file, {force: true})
      }
    })

    it('accepts records piped on stdin', async function () {
      const result = await cli(['dataset', 'ingest', datasetId, '--json'], {stdin: JSON.stringify(DEFAULT_RECORDS)})

      if (result.code !== 0 && /upstream service error/i.test(errorText(result))) {
        console.log('   skip: ingestion pipeline unavailable on this environment')
        this.skip()
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

      expectOk(await cli(['account', 'info', '--json']))

      const after = fs.existsSync(configFile) ? fs.statSync(configFile).mtimeMs : null
      expect(after).to.equal(before)
    })

    it('sends x-account-id when --account-id is set', async function () {
      const {accountId} = getConfig()
      if (!accountId) this.skip()

      const scoped = json<{id: number}>(await cli(['account', 'info', '--account-id', accountId!, '--json']))
      expect(String(scoped.id)).to.equal(accountId)
    })
  })
})
