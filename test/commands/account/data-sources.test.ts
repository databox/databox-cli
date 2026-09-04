import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account data-sources', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [
              {
                id: 10,
                title: 'My Source',
                integrationKey: 'DataboxAPI',
                timezone: 'UTC',
                connectionId: null,
              },
            ],
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

  it('lists data sources', async () => {
    const {stdout} = await runCommand(['account', 'data-sources'], {root: process.cwd()})
    expect(stdout).to.contain('My Source')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'data-sources', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({id: 10, title: 'My Source'})
  })
})
