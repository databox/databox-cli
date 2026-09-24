import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {organization} from './fixtures.js'

describe('organization info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/organization',
        response: {data: organization, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows organization details', async () => {
    const {stdout} = await runCommand(['organization', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Test Organization')
    expect(stdout).to.contain('Company Name: Test Co')
    expect(stdout).to.contain('Tax Number: US123')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['organization', 'info', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(organization)
  })
})
