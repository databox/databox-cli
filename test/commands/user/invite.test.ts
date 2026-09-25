import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

function mockInvite(): void {
  mockApi([
    {
      method: 'POST',
      path: '/v2/users',
      response: {
        data: {
          email: 'new@test.com', id: 2, name: '', role: 'editor',
        }, requestId: 'test', status: 'success',
      },
    },
  ])
}

describe('user invite', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('invites a user', async () => {
    mockInvite()
    const {stdout} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'editor'], {root: process.cwd()})
    expect(stdout).to.contain('new@test.com')
  })

  it('outputs JSON with --json', async () => {
    mockInvite()
    const {stdout} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'editor', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({
      email: 'new@test.com', id: 2, name: '', role: 'editor',
    })
  })

  for (const role of ['admin', 'user', 'editor', 'viewer']) {
    it(`sends the ${role} role`, async () => {
      mockInvite()
      await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', role, '--name', 'New'], {root: process.cwd()})
      expect(lastBody('POST', '/v2/users')).to.deep.equal({email: 'new@test.com', name: 'New', role})
    })
  }

  it('rejects a role the API does not know with exit 2', async () => {
    mockInvite()
    const {error} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'owner'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })

  it('keeps the API error on a duplicate email and adds a hint to user update', async () => {
    mockApi([{
      method: 'POST',
      path: '/v2/users',
      response: {
        errors: [{
          code: 'duplicate_record', field: 'email', message: "A user with email 'new@test.com' is already part of this account.", type: 'request',
        }],
        requestId: 'req-dup',
        status: 'error',
      },
      status: 409,
    }])

    const {error} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'user'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message.split('\n')).to.deep.equal([
      'duplicate_record',
      "  A user with email 'new@test.com' is already part of this account.",
      '  Field: email',
      '  Request ID: req-dup',
      '  Hint: to change an existing user\'s role or name, run "user update <userId>" (find the ID with "user list --search <email>").',
    ])
  })

  it('adds no hint to other API errors', async () => {
    mockApi([{
      method: 'POST',
      path: '/v2/users',
      response: {
        errors: [{
          code: 'access_denied', field: '', message: "Non-admin users can only invite users with the 'user' role", type: 'authorization',
        }],
        requestId: 'req-403',
        status: 'error',
      },
      status: 403,
    }])

    const {error} = await runCommand(['user', 'invite', '--email', 'new@test.com', '--role', 'admin'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(1)
    expect(error?.message).to.contain('access_denied')
    expect(error?.message).to.not.contain('Hint')
  })
})
