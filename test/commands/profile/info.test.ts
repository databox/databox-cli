import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {accountProfile, profile} from './fixtures.js'

describe('profile info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/profile',
        response: {data: profile, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows profile details', async () => {
    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Test User')
    expect(stdout).to.contain('test@example.com')
  })

  it('spells out the organization, and no account for an organization-level user', async () => {
    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Organization: Acme Org (100)')
    expect(stdout).to.contain('Account: none (organization level)')
    expect(stdout).to.not.contain('{"id"')
  })

  it('spells out the account of an account-level user', async () => {
    restoreApi()
    mockApi([{method: 'GET', path: '/v2/profile', response: {data: accountProfile, requestId: 'test', status: 'success'}}])

    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Organization: Acme Org (100)')
    expect(stdout).to.contain('Account: Acme Retail (200)')
  })

  it('says a name is unavailable when the API could not look it up', async () => {
    restoreApi()
    mockApi([{
      method: 'GET',
      path: '/v2/profile',
      response: {
        data: {...profile, account: {id: 200, name: null}, organization: {id: 100, name: null}}, requestId: 'test', status: 'success',
      },
    }])

    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Organization: (name unavailable) (100)')
    expect(stdout).to.contain('Account: (name unavailable) (200)')
  })

  it('says the organization is unavailable when its id could not be resolved', async () => {
    const degraded = {...accountProfile, organization: {id: null, name: null}}
    restoreApi()
    mockApi([{method: 'GET', path: '/v2/profile', response: {data: degraded, requestId: 'test', status: 'success'}}])

    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Organization: unavailable')
    expect(stdout).to.contain('Account: Acme Retail (200)')

    const {stdout: jsonOut} = await runCommand(['profile', 'info', '--json'], {root: process.cwd()})
    expect(JSON.parse(jsonOut)).to.deep.equal(degraded)
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'info', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(profile)
  })

  it('keeps organization and account as fields with --output csv', async () => {
    const {stdout} = await runCommand(['profile', 'info', '--output', 'csv'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines).to.include('organization,"{""id"":100,""name"":""Acme Org""}"')
    expect(lines).to.include('account,')
  })
})
