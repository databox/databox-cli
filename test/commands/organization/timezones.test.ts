import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('organization timezones', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/organization/timezones',
        response: {
          data: {items: [{offset: 'UTC+1', timezone: 'Europe/Berlin'}]},
          requestId: 'test',
          status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists timezones', async () => {
    const {stdout} = await runCommand(['organization', 'timezones'], {root: process.cwd()})
    expect(stdout).to.contain('Europe/Berlin')
    expect(stdout).to.contain('UTC+1')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['organization', 'timezones', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({offset: 'UTC+1', timezone: 'Europe/Berlin'})
  })
})
