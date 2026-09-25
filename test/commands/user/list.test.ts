import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('user list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/users',
        response: {
          data: {
            items: [{
              email: 'admin@test.com', id: 1, name: 'Admin', role: 'admin',
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

  it('lists users', async () => {
    const {stdout} = await runCommand(['user', 'list'], {root: process.cwd()})
    expect(stdout).to.contain('Admin')
    expect(stdout).to.contain('admin@test.com')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['user', 'list', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed[0]).to.deep.include({id: 1, name: 'Admin'})
  })

  it('sends the role filter, which includes viewer', async () => {
    await runCommand(['user', 'list', '--role', 'viewer'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?role=viewer')
  })

  it('rejects a role the API does not know with exit 2', async () => {
    const {error} = await runCommand(['user', 'list', '--role', 'owner'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
