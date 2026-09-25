import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {accountDetail} from './fixtures.js'

const created = {
  ...accountDetail, companyName: 'NewAccount', id: 2, name: 'NewAccount', websiteUrl: null,
}

describe('account create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/accounts',
        response: {data: created, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates an account', async () => {
    const {stdout} = await runCommand(['account', 'create', '--name', 'NewAccount'], {root: process.cwd()})
    expect(stdout).to.contain('NewAccount')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'create', '--name', 'NewAccount', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(created)
  })

  it('sends name, managedById and websiteUrl', async () => {
    await runCommand([
      'account', 'create', '--name', 'NewAccount', '--managed-by-id', '31', '--website-url', 'https://new.example.com',
    ], {root: process.cwd()})
    expect(lastBody('POST', '/v2/accounts')).to.deep.equal({
      managedById: 31, name: 'NewAccount', websiteUrl: 'https://new.example.com',
    })
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['account', 'create', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
