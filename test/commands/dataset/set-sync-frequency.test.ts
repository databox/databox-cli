import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetDetail, envelope} from './fixtures.js'

describe('dataset set-sync-frequency', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/sync-frequency', response: envelope({...datasetDetail, syncInterval: 1440})}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets sync frequency', async () => {
    const {stdout} = await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '60'], {root: process.cwd()})
    expect(stdout).to.include('Sync frequency set')
  })

  // The API contract is {syncInterval}, not {interval}.
  it('sends syncInterval, not interval', async () => {
    await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '60'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/datasets/123/sync-frequency')).to.deep.equal({syncInterval: 60})
  })

  it('prints the updated dataset with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '1440', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal({...datasetDetail, syncInterval: 1440})
  })

  it('rejects an interval the API does not know with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'set-sync-frequency', '123', '--interval', '30'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.length(0)
  })
})
