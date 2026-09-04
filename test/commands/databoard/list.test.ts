import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('databoard list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/databoards',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [{id: 1, name: 'Marketing Dashboard', tags: ['marketing'], integrationKeys: ['GoogleAnalytics4']}],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists databoards', async () => {
    const {stdout} = await runCommand(['databoard', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Marketing Dashboard')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['databoard', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
