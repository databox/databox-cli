import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {datasetDetail, envelope} from './fixtures.js'

const updated = {...datasetDetail, timezone: 'Europe/London'}

describe('dataset set-timezone', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/timezone', response: envelope(updated)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('sets timezone', async () => {
    const {stdout} = await runCommand(['dataset', 'set-timezone', '123', '--timezone', 'Europe/London'], {root: process.cwd()})
    expect(stdout).to.include('Timezone set to Europe/London for dataset 123.')
    expect(lastBody('PUT', '/v2/datasets/123/timezone')).to.deep.equal({purgeData: false, timezone: 'Europe/London'})
  })

  it('prints the updated dataset with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-timezone', '123', '--timezone', 'Europe/London', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })
})
