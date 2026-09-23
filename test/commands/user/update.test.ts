import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {userDetail} from './fixtures.js'

describe('user update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/users/1',
        response: {data: userDetail, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates user role', async () => {
    const {stdout} = await runCommand(['user', 'update', '1', '--role', 'admin'], {root: process.cwd()})
    expect(stdout).to.contain('Admin')
    expect(stdout).to.contain('admin')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['user', 'update', '1', '--role', 'admin', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(userDetail)
  })

  for (const role of ['admin', 'user', 'editor', 'viewer']) {
    it(`sends the ${role} role`, async () => {
      await runCommand(['user', 'update', '1', '--role', role], {root: process.cwd()})
      expect(lastBody('PATCH', '/v2/users/1')).to.deep.equal({role})
    })
  }

  it('sends a name', async () => {
    await runCommand(['user', 'update', '1', '--name', '"Jane Doe"'], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/users/1')).to.deep.equal({name: 'Jane Doe'})
  })

  it('rejects the owner role with exit 2', async () => {
    const {error} = await runCommand(['user', 'update', '1', '--role', 'owner'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['user', 'update', '1', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
