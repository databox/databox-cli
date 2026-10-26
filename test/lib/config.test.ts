import {Errors} from '@oclif/core'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  DataboxConfig, getConfigPath, loadConfig, storedApiUrl,
} from '../../src/lib/config.js'
import {cleanupTestConfig, setupEmptyConfig} from '../helpers.js'

describe('loadConfig', () => {
  beforeEach(() => {
    setupEmptyConfig()
  })

  afterEach(() => {
    cleanupTestConfig()
  })

  it('returns an empty config when there is no file', () => {
    expect(loadConfig()).to.deep.equal({})
  })

  it('names the file and drops the parser message, which quotes part of the key', () => {
    const file = getConfigPath()
    fs.mkdirSync(path.dirname(file), {recursive: true})
    fs.writeFileSync(file, '{"apiKey": pak_FAKEFAKEFAKE}')

    let message = ''
    try {
      loadConfig()
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).to.equal(`Config file ${file} is not valid JSON. Delete it and run "databox auth login" again.`)
    expect(message).to.not.contain('pak_')
  })
})

/** The error storedApiUrl throws for a config as it might be hand-edited, whatever its types. */
function refusal(config: unknown): Errors.CLIError {
  try {
    storedApiUrl(config as DataboxConfig)
  } catch (error) {
    return error as Errors.CLIError
  }

  throw new Error('Expected storedApiUrl to throw')
}

describe('storedApiUrl', () => {
  beforeEach(() => {
    setupEmptyConfig()
  })

  afterEach(() => {
    cleanupTestConfig()
  })

  it('is undefined when no URL is stored, or a hand-edited null', () => {
    expect(storedApiUrl({})).to.equal(undefined)
    expect(storedApiUrl({apiUrl: null} as unknown as DataboxConfig)).to.equal(undefined)
  })

  it('returns the stored URL trimmed, without a trailing slash', () => {
    expect(storedApiUrl({apiUrl: ' https://staging.example.com/ \n'})).to.equal('https://staging.example.com')
  })

  it('refuses a URL isApiUrl refuses with exit 1, naming the path and not the value', () => {
    const error = refusal({apiUrl: 'pak_FAKEFAKEFAKE'})

    expect(error.oclif.exit).to.equal(1)
    expect(error.message).to.equal(`The API URL saved in ${getConfigPath()} does not start with http:// or https://. `
      + 'Run "databox auth login --api-url https://api.databox.com" to replace it.')
  })

  it('refuses a value that is not a string with exit 1', () => {
    const error = refusal({apiUrl: 8080})

    expect(error.oclif.exit).to.equal(1)
    expect(error.message).to.contain('is not a string')
  })
})
