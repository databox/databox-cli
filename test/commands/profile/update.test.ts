import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {profile} from './fixtures.js'

const updated = {...profile, name: 'NewName'}

describe('profile update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/profile',
        response: {data: updated, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates profile name', async () => {
    const {stdout} = await runCommand(['profile', 'update', '--name', 'NewName'], {root: process.cwd()})
    expect(stdout).to.contain('NewName')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['profile', 'update', '--name', 'NewName', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('sends metadata, including an empty string to clear a field', async () => {
    await runCommand(['profile', 'update', '--metadata', '{"department":"","role":"","title":"Lead"}'], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/profile')).to.deep.equal({metadata: {department: '', role: '', title: 'Lead'}})
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['profile', 'update', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
