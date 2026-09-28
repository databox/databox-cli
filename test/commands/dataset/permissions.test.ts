import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const permissions = {accessLevel: 'selectedUsers', accessList: [{id: 31, name: 'Ada'}]}

describe('dataset permissions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/permissions', response: envelope(permissions)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows permissions', async () => {
    const {stdout} = await runCommand(['dataset', 'permissions', '123'], {root: process.cwd()})
    expect(stdout).to.include('selectedUsers')
    expect(stdout).to.include('Ada')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'permissions', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(permissions)
  })
})
