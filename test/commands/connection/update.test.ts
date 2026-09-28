import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {connectionDetail} from './fixtures.js'

const updated = {...connectionDetail, name: 'Updated'}

describe('connection update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/connections/1',
        response: {
          data: updated,
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

  it('updates a connection', async () => {
    const {stdout} = await runCommand(['connection', 'update', '1', '--name', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['connection', 'update', '1', '--name', 'Updated', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('sends the name', async () => {
    await runCommand(['connection', 'update', '1', '--name', 'Updated'], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/connections/1')).to.deep.equal({name: 'Updated'})
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['connection', 'update', '1', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
