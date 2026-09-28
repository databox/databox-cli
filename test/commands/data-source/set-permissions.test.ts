import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'

describe('data-source set-permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/data-sources/42/permissions', response: envelope({accessLevel: 'everyone', accessList: null})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets permissions', async () => {
    const {stdout} = await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'everyone'], {root: process.cwd()})
    expect(stdout).to.include('everyone')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'everyone', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({accessLevel: 'everyone', accessList: null})
  })

  it('sends private with no access list', async () => {
    await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'private'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/data-sources/42/permissions')).to.deep.equal({accessLevel: 'private'})
  })

  it('sends selectedUsers with the access list', async () => {
    await runCommand([
      'data-source', 'set-permissions', '42', '--access-level', 'selectedUsers', '--access-list', '31', '--access-list', '42',
    ], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/data-sources/42/permissions')).to.deep.equal({accessLevel: 'selectedUsers', accessList: [31, 42]})
  })

  it('requires --access-list with selectedUsers (exit 2)', async () => {
    const {error} = await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'selectedUsers'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })

  it('rejects --access-list without selectedUsers (exit 2)', async () => {
    const {error} = await runCommand([
      'data-source', 'set-permissions', '42', '--access-level', 'private', '--access-list', '31',
    ], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--access-list')
    expect(requests()).to.have.length(0)
  })

  it('rejects an unknown access level with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'set-permissions', '42', '--access-level', 'nobody'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
