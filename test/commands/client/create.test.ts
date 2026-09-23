import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {clientDetail} from './fixtures.js'

const created = {
  ...clientDetail, companyName: 'NewClient', id: 2, name: 'NewClient', websiteUrl: null,
}

describe('client create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/clients',
        response: {data: created, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a client', async () => {
    const {stdout} = await runCommand(['client', 'create', '--name', 'NewClient'], {root: process.cwd()})
    expect(stdout).to.contain('NewClient')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['client', 'create', '--name', 'NewClient', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(created)
  })

  it('sends name, managedById and websiteUrl', async () => {
    await runCommand([
      'client', 'create', '--name', 'NewClient', '--managed-by-id', '31', '--website-url', 'https://new.example.com',
    ], {root: process.cwd()})
    expect(lastBody('POST', '/v2/clients')).to.deep.equal({
      managedById: 31, name: 'NewClient', websiteUrl: 'https://new.example.com',
    })
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['client', 'create', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
