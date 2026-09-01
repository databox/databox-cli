import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('client list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/clients',
        response: {status: 'success', requestId: 'test', data: {items: [{id: 1, name: 'Client A', accountType: 'client'}], pagination: {page: 0, pageSize: 25, totalItems: 1}}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists clients', async () => {
    const {stdout} = await runCommand(['client', 'list'], {root: process.cwd()})
    expect(stdout).to.contain('Client A')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['client', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0]).to.deep.include({id: 1, name: 'Client A'})
  })
})
