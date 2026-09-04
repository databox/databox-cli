import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('client update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/clients/1',
        response: {status: 'success', requestId: 'test', data: {id: 1, name: 'UpdatedClient'}},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates client name', async () => {
    const {stdout} = await runCommand(['client', 'update', '1', '--name', 'UpdatedClient'], {root: process.cwd()})
    expect(stdout).to.contain('UpdatedClient')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['client', 'update', '1', '--name', 'UpdatedClient', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.deep.include({id: 1, name: 'UpdatedClient'})
  })
})
