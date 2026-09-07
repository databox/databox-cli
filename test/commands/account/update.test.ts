import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('account update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/account',
        response: {data: {accountType: 'standard', id: 1, name: 'UpdatedName'}, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates account name', async () => {
    const {stdout} = await runCommand(['account', 'update', '--name', 'UpdatedName'], {root: process.cwd()})
    expect(stdout).to.contain('UpdatedName')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'update', '--name', 'UpdatedName', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'UpdatedName'})
  })

  it('sends the full contract surface', async () => {
    await runCommand([
      'account', 'update',
      '--name', 'N', '--company-name', 'C', '--website-url', 'W',
      '--tax-number', 'T', '--billing-name', 'B',
      '--address', '{"city":"Boston"}',
      '--settings', '{"calendar":"Gregorian"}',
      '--metadata', '{"companySize":"10"}',
    ], {root: process.cwd()})

    expect(lastBody('PATCH', '/v2/account')).to.deep.equal({
      address: {city: 'Boston'}, billingName: 'B', companyName: 'C', metadata: {companySize: '10'}, name: 'N',
      settings: {calendar: 'Gregorian'}, taxNumber: 'T', websiteUrl: 'W',
    })
  })
})
