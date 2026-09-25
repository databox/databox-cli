import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetDetail, envelope} from './fixtures.js'

describe('dataset get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123', response: envelope(datasetDetail)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets dataset details', async () => {
    const {stdout} = await runCommand(['dataset', 'get', '123'], {root: process.cwd()})
    expect(stdout).to.contain('Orders')
    expect(stdout).to.contain('Row Count: 1500')
    expect(stdout).to.contain('Sync Interval: 60')
  })

  it('outputs the detail whole with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'get', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(datasetDetail)
  })

  it('rejects non-numeric dataset ID', async () => {
    const {error} = await runCommand(['dataset', 'get', 'abc'], {root: process.cwd()})
    expect(error?.message).to.include('must be a numeric value')
  })
})
