import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account data-sources', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/accounts/123/data-sources',
        response: {
          dataSources: [
            {
              id: 10,
              title: 'My Source',
              created: '2024-01-01T00:00:00Z',
              timezone: 'UTC',
              key: 'src_1',
              ingestionSupported: true,
            },
          ],
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists data sources for account', async () => {
    const {stdout} = await runCommand(['account', 'data-sources', '123'], {root: process.cwd()})
    expect(stdout).to.contain('My Source')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'data-sources', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({id: 10, title: 'My Source'})
  })
})
