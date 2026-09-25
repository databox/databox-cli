import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {accountDetail} from './fixtures.js'

const updated = {...accountDetail, companyName: 'UpdatedAccount', name: 'UpdatedAccount'}

describe('account update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/accounts/1',
        response: {data: updated, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates account name', async () => {
    const {stdout} = await runCommand(['account', 'update', '1', '--name', 'UpdatedAccount'], {root: process.cwd()})
    expect(stdout).to.contain('UpdatedAccount')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'update', '1', '--name', 'UpdatedAccount', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('sends name, managedById and websiteUrl', async () => {
    await runCommand([
      'account', 'update', '1', '--name', 'UpdatedAccount', '--managed-by-id', '31', '--website-url', 'https://new.example.com',
    ], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/accounts/1')).to.deep.equal({
      managedById: 31, name: 'UpdatedAccount', websiteUrl: 'https://new.example.com',
    })
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['account', 'update', '1', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
