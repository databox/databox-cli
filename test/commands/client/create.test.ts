import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('client create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/clients',
        response: {status: 'success', requestId: 'test', data: {id: 2, name: 'NewClient'}},
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
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 2, name: 'NewClient'})
  })
})
