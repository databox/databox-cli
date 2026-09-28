import {expect} from 'chai'

import {CliResult, errorText, expectNoKey} from './e2e/helpers/cli.js'
import {resetConfig} from './e2e/helpers/env.js'

function result(stderr: string, stdout = ''): CliResult {
  return {
    argv: [], code: 2, stderr, stdout, timedOut: false,
  }
}

/**
 * Every e2e error assertion goes through errorText, so a phrase oclif wraps across lines must
 * still match as one. Covered here, in the fast suite, because the e2e suite only exercises it
 * against a live API.
 */
describe('e2e errorText', () => {
  // errorText redacts the configured key, which memoizes the resolved config.
  afterEach(() => resetConfig())

  it('strips the wrapped-line gutter, so a phrase split across lines reads as one', () => {
    const stderr = ' ›   Error: Expected --sort-by=datasetType to be one of: name, createdAt,  \n'
      + ' ›   lastActivityAt\n'
      + ' ›   See more help with --help\n'

    expect(errorText(result(stderr))).to.equal(
      'Error: Expected --sort-by=datasetType to be one of: name, createdAt, lastActivityAt See more help with --help',
    )
  })

  it('strips the » gutter too', () => {
    expect(errorText(result(' »   Error: first line\n »   second line\n'))).to.equal('Error: first line second line')
  })

  it('collapses runs of whitespace, including those between stderr and stdout', () => {
    expect(errorText(result('Error:\t  not_found\n\n  Request ID: abc', '  trailing  '))).to.equal(
      'Error: not_found Request ID: abc trailing',
    )
  })

  it('leaves a normal unwrapped message unchanged', () => {
    expect(errorText(result('Error: --name cannot be empty.'))).to.equal('Error: --name cannot be empty.')
  })

  it('keeps a › that is not at the start of a line', () => {
    expect(errorText(result('Error: a › b'))).to.equal('Error: a › b')
  })
})

function succeeded(stdout: string, stderr = ''): CliResult {
  return {
    argv: ['organization', 'info', '--json'], code: 0, stderr, stdout, timedOut: false,
  }
}

function failureOf(assertion: () => unknown): string {
  try {
    assertion()
  } catch (error) {
    return (error as Error).message
  }

  throw new Error('expected the assertion to fail')
}

/**
 * expectNoKey fails exactly when the key has leaked, so its own message must not print it
 * again — a chai `to.not.include(apiKey)` quotes the value it was looking for.
 */
describe('e2e expectNoKey', () => {
  const KEY = 'pak_test-secret-not-for-printing'
  const saved = process.env.DATABOX_E2E_API_KEY

  beforeEach(() => {
    process.env.DATABOX_E2E_API_KEY = KEY
    resetConfig()
  })

  afterEach(() => {
    if (saved === undefined) {
      delete process.env.DATABOX_E2E_API_KEY
    } else {
      process.env.DATABOX_E2E_API_KEY = saved
    }

    resetConfig()
  })

  it('passes output that does not carry the key', () => {
    const clean = succeeded('{"name": "Acme"}', 'Request: GET /v2/organization')
    expect(expectNoKey(clean)).to.equal(clean)
  })

  it('names the command and stream of a leak on stdout, without the key', () => {
    const message = failureOf(() => expectNoKey(succeeded(`{"apiKey": "${KEY}"}`)))

    expect(message).to.include('stdout of "databox organization info --json"')
    expect(message).to.not.include(KEY)
  })

  it('names stderr when the leak is there, without the key', () => {
    const message = failureOf(() => expectNoKey(succeeded('{}', `Headers: x-api-key: ${KEY}`)))

    expect(message).to.include('stderr')
    expect(message).to.not.include(KEY)
  })

  it('says so when no key is configured, rather than reporting a leak', () => {
    delete process.env.DATABOX_E2E_API_KEY
    resetConfig()

    expect(() => expectNoKey(succeeded('anything'))).to.throw(/No API key is configured/)
  })
})
