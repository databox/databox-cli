import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, setupTestConfig} from '../helpers.js'

/**
 * Every flag whose value is parsed as JSON must reject malformed input with exit 2
 * and a message naming the flag — never a raw SyntaxError.
 *
 * Covered as a table rather than one case per command file: this is a sweep over a
 * single rule, and keeping the list in one place makes a gap visible. No API mock is
 * needed because parsing happens before any request.
 */

const BAD = '{nope'

const cases: Array<{argv: string[]; flag: string}> = [
  {argv: ['account', 'update', '--address', BAD], flag: 'address'},
  {argv: ['account', 'update', '--settings', BAD], flag: 'settings'},
  {argv: ['account', 'update', '--metadata', BAD], flag: 'metadata'},
  {argv: ['dataset', 'create', '--name', 'n', '--data-source-id', '1', '--schema', BAD], flag: 'schema'},
  {argv: ['dataset', 'add-modification', '123', '--data', BAD], flag: 'data'},
  {argv: ['dataset', 'update-modification', '123', '--data', BAD], flag: 'data'},
  {argv: ['dataset', 'preview-modification', '123', '--data', BAD], flag: 'data'},
  {argv: ['dataset', 'set-column-metadata', '123', '--columns', BAD], flag: 'columns'},
  {argv: ['dataset', 'set-metadata', '123', '--synonyms', BAD], flag: 'synonyms'},
  {argv: ['metric', 'create', '--name', 'n', '--dataset-id', '1', '--date', BAD, '--measure', '{}'], flag: 'date'},
  {argv: ['metric', 'create', '--name', 'n', '--dataset-id', '1', '--date', '{}', '--measure', BAD], flag: 'measure'},
  {
    argv: ['metric', 'create', '--name', 'n', '--dataset-id', '1', '--date', '{}', '--measure', '{}', '--dimension', BAD],
    flag: 'dimension',
  },
  {
    argv: ['metric', 'create', '--name', 'n', '--dataset-id', '1', '--date', '{}', '--measure', '{}', '--filters', BAD],
    flag: 'filters',
  },
  {argv: ['metric', 'update', '42|q', '--measure', BAD], flag: 'measure'},
  {argv: ['metric', 'update', '42|q', '--date', BAD], flag: 'date'},
  {argv: ['metric', 'update', '42|q', '--dimension', BAD], flag: 'dimension'},
  {argv: ['metric', 'update', '42|q', '--filters', BAD], flag: 'filters'},
  {
    argv: [
      'metric', 'data', '--metric-id', '42|q', '--dataset-id', '1',
      '--date-from', '2026-01-01', '--date-to', '2026-01-02',
      '--granularity', 'daily', '--filters', BAD,
    ],
    flag: 'filters',
  },
  {argv: ['profile', 'update', '--metadata', BAD], flag: 'metadata'},
]

describe('validation: malformed JSON flags', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    cleanupTestConfig()
  })

  for (const {argv, flag} of cases) {
    it(`${argv.slice(0, 2).join(' ')} --${flag} exits 2`, async () => {
      const {error} = await runCommand(argv, {root: process.cwd()})

      expect(error?.oclif?.exit, `exit code for --${flag}`).to.equal(2)
      expect(error?.message, `message for --${flag}`).to.contain(`--${flag}`)
    })
  }

  // dataset ingest keeps its own messages, one per input mode.
  it('dataset ingest --records exits 2', async () => {
    const {error} = await runCommand(['dataset', 'ingest', '123', '--records', BAD], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--records')
  })

  it('dataset ingest --file exits 2 when the file is missing', async () => {
    const {error} = await runCommand(['dataset', 'ingest', '123', '--file', '/no/such/file.json'], {
      root: process.cwd(),
    })
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('File not found')
  })
})
