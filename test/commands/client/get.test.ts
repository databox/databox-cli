import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('client get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/clients/1',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'Client A', accountType: 'client'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows client details', async () => {
    const {stdout} = await runCommand(['client', 'get', '1'], {root: process.cwd()})
    expect(stdout).to.contain('Client A')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['client', 'get', '1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'Client A'})
  })
})
