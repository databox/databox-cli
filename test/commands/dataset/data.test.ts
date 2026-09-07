import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset data', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/data',
      response: {
        data: {items: [{amount: 100, id: 1, name: 'Alice'}], pagination: {page: 0, pageSize: 25, totalItems: 1}},
        requestId: 'test',
        status: 'success',
      },
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows dataset data', async () => {
    const {stdout} = await runCommand(['dataset', 'data', '123'], {root: process.cwd()})
    expect(stdout).to.include('Alice')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'data', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
