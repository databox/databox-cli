import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceDetail} from './fixtures.js'

const updated = {...dataSourceDetail, name: 'Updated'}

describe('data-source update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/data-sources/42',
        response: envelope(updated),
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates a data source', async () => {
    const {stdout} = await runCommand(['data-source', 'update', '42', '--name', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'update', '42', '--name', 'Updated', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('sends the name', async () => {
    await runCommand(['data-source', 'update', '42', '--name', 'Updated'], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/data-sources/42')).to.deep.equal({name: 'Updated'})
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'update', '42', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
