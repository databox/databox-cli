import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceDetail} from './fixtures.js'

const updated = {...dataSourceDetail, syncInterval: 1440}

describe('data-source set-sync-frequency', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/data-sources/42/sync-frequency', response: envelope(updated)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('confirms in table mode', async () => {
    const {stdout} = await runCommand(['data-source', 'set-sync-frequency', '42', '--interval', '60'], {root: process.cwd()})
    expect(stdout.trim()).to.equal('Sync frequency set to 60 minutes for data source 42.')
  })

  // The API contract is {syncInterval}, not {interval}.
  it('sends syncInterval, not interval', async () => {
    await runCommand(['data-source', 'set-sync-frequency', '42', '--interval', '60'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/data-sources/42/sync-frequency')).to.deep.equal({syncInterval: 60})
  })

  it('prints the updated data source with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'set-sync-frequency', '42', '--interval', '1440', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('rejects an interval the API does not know with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'set-sync-frequency', '42', '--interval', '30'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
