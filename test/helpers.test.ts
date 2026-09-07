import {expect} from 'chai'
import * as os from 'node:os'
import * as path from 'node:path'

import {getConfigPath} from '../src/lib/config.js'
import {cleanupTestConfig, setupEmptyConfig, setupTestConfig} from './helpers.js'

/**
 * The unit harness used to read and overwrite the developer's real
 * ~/.config/databox-cli/config.json — an interrupted run destroyed their credentials,
 * and `auth login` tests wrote a junk key into it. These pin the redirection so that
 * cannot come back.
 */
describe('test harness config isolation', () => {
  const realHome = os.homedir()

  afterEach(() => {
    cleanupTestConfig()
  })

  it('setupTestConfig points the CLI away from the real home', () => {
    setupTestConfig()

    const configPath = getConfigPath()
    expect(configPath).to.not.contain(path.join(realHome, '.config', 'databox-cli'))
    expect(configPath).to.contain(os.tmpdir().replace(/\/$/, ''))
  })

  it('setupEmptyConfig gives a temp home with no config', () => {
    setupEmptyConfig()

    const configPath = getConfigPath()
    expect(configPath).to.not.contain(path.join(realHome, '.config', 'databox-cli'))
  })

  it('cleanupTestConfig restores the original home', () => {
    setupTestConfig()
    expect(os.homedir()).to.not.equal(realHome)

    cleanupTestConfig()
    expect(os.homedir()).to.equal(realHome)
  })
})
