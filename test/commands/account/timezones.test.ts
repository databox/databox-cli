import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account timezones', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/accounts/timezones',
        response: {timezones: [{offset: 'UTC+1', timezone: 'Europe/Berlin'}]},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists timezones', async () => {
    const {stdout} = await runCommand(['account', 'timezones'], {root: process.cwd()})
    expect(stdout).to.contain('Europe/Berlin')
    expect(stdout).to.contain('UTC+1')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'timezones', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({offset: 'UTC+1', timezone: 'Europe/Berlin'})
  })
})
