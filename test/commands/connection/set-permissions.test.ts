import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

const permissions = {accessLevel: 'everyone', accessList: null, sharedWithClients: true}

describe('connection set-permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PUT',
        path: '/v2/connections/1/permissions',
        response: {
          data: permissions,
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

  it('sets permissions', async () => {
    const {stdout} = await runCommand([
      'connection', 'set-permissions', '1', '--access-level', 'everyone', '--shared-with-clients',
    ], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand([
      'connection', 'set-permissions', '1', '--access-level', 'everyone', '--shared-with-clients', '--json',
    ], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(permissions)
  })

  it('sends sharedWithClients true with --shared-with-clients', async () => {
    await runCommand(['connection', 'set-permissions', '1', '--access-level', 'everyone', '--shared-with-clients'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/connections/1/permissions')).to.deep.equal({accessLevel: 'everyone', sharedWithClients: true})
  })

  it('sends sharedWithClients false with --no-shared-with-clients', async () => {
    await runCommand([
      'connection', 'set-permissions', '1', '--access-level', 'selectedUsers', '--access-list', '31', '--no-shared-with-clients',
    ], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/connections/1/permissions')).to.deep.equal({
      accessLevel: 'selectedUsers', accessList: [31], sharedWithClients: false,
    })
  })

  // A default would silently un-share a shared connection, so the choice is the user's to make.
  it('requires a sharing choice (exit 2)', async () => {
    const {error} = await runCommand(['connection', 'set-permissions', '1', '--access-level', 'everyone'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('shared-with-clients')
    expect(requests()).to.have.length(0)
  })

  it('requires --access-list with selectedUsers (exit 2)', async () => {
    const {error} = await runCommand([
      'connection', 'set-permissions', '1', '--access-level', 'selectedUsers', '--no-shared-with-clients',
    ], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })

  it('rejects --access-list without selectedUsers (exit 2)', async () => {
    const {error} = await runCommand([
      'connection', 'set-permissions', '1', '--access-level', 'everyone', '--access-list', '31', '--shared-with-clients',
    ], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--access-list is only accepted with --access-level selectedUsers')
    expect(requests()).to.have.length(0)
  })
})
