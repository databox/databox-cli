import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {profile} from './fixtures.js'

describe('profile info', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/profile',
        response: {data: profile, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows profile details', async () => {
    const {stdout} = await runCommand(['profile', 'info'], {root: process.cwd()})
    expect(stdout).to.contain('Test User')
    expect(stdout).to.contain('test@example.com')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'info', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(profile)
  })
})
