import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('integration list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/integrations',
        response: {
          data: {
            items: [{
              id: 101, key: 'GoogleAnalytics4', name: 'Google Analytics 4', supportsDatasets: true,
            }],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
          requestId: 'test',
          status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists integrations', async () => {
    const {stdout} = await runCommand(['integration', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Google Analytics 4')
  })

  it('prints supportsDatasets as yes/no', async () => {
    const {stdout} = await runCommand(['integration', 'list'], {root: process.cwd()})
    const row = stdout.split('\n').find(line => line.includes('Google Analytics 4'))
    expect(row).to.match(/\byes\s*$/)
    expect(stdout).to.not.include('true')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['integration', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })

  it('sorts by name', async () => {
    await runCommand(['integration', 'list', '--sort-by', 'name', '--sort-order', 'desc'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?sortBy=name&sortOrder=desc')
  })

  it('rejects a sort field the API does not know with exit 2', async () => {
    const {error} = await runCommand(['integration', 'list', '--sort-by', 'key'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
