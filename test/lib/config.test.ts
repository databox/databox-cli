import {expect} from 'chai'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {getConfigPath, loadConfig} from '../../src/lib/config.js'
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
