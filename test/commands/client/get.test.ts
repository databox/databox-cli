import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {clientDetail} from './fixtures.js'

describe('client get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/clients/1',
        response: {data: clientDetail, requestId: 'test', status: 'success'},
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
    expect(JSON.parse(stdout)).to.deep.equal(clientDetail)
  })
})
