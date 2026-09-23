import {expect} from 'chai'

import {CliResult, errorText} from './e2e/helpers/cli.js'
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
