import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('account list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/accounts',
        response: {
          data: {
            items: [{
              id: 1, isSelfManaged: false, managedBy: {id: 31, name: 'Ada'}, name: 'Account A',
            }], pagination: {page: 0, pageSize: 25, totalItems: 1},
          }, requestId: 'test', status: 'success',
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists accounts', async () => {
    const {stdout} = await runCommand(['account', 'list'], {root: process.cwd()})
    expect(stdout).to.contain('Account A')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0]).to.deep.include({id: 1, name: 'Account A'})
  })

  // The API passes sortBy upstream unvalidated, so the CLI does not restrict it either.
  it('passes any --sort-by through', async () => {
    await runCommand(['account', 'list', '--sort-by', 'website', '--sort-order', 'asc'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?sortBy=website&sortOrder=asc')
  })
})
