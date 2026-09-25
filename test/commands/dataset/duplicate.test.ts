import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetDetail, envelope} from './fixtures.js'

const duplicate = {...datasetDetail, id: 456, name: 'Orders (copy)'}

describe('dataset duplicate', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets/123/duplicate', response: envelope(duplicate)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('duplicates a dataset', async () => {
    const {stdout} = await runCommand(['dataset', 'duplicate', '123'], {root: process.cwd()})
    expect(stdout).to.include('456')
    expect(stdout).to.include('Orders (copy)')
  })

  it('sends the name when given', async () => {
    await runCommand(['dataset', 'duplicate', '123', '--name', 'Orders-copy'], {root: process.cwd()})
    expect(lastBody('POST', '/v2/datasets/123/duplicate')).to.deep.equal({name: 'Orders-copy'})
  })

  it('outputs the new dataset with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'duplicate', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(duplicate)
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'duplicate', '123', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
