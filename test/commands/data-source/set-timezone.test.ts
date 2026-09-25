import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceDetail} from './fixtures.js'

const updated = {...dataSourceDetail, timezone: 'US/Eastern'}

describe('data-source set-timezone', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/data-sources/42/timezone', response: envelope(updated)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('confirms in table mode', async () => {
    const {stdout} = await runCommand(['data-source', 'set-timezone', '42', '--timezone', 'US/Eastern'], {root: process.cwd()})
    expect(stdout.trim()).to.equal('Timezone set to "US/Eastern" for data source 42.')
  })

  it('says the existing data was purged with --purge-data', async () => {
    const {stdout} = await runCommand(['data-source', 'set-timezone', '42', '--timezone', 'US/Eastern', '--purge-data'], {root: process.cwd()})
    expect(stdout.trim()).to.equal('Timezone set to "US/Eastern" for data source 42; its existing data was purged.')
    expect(lastBody('PUT', '/v2/data-sources/42/timezone')).to.deep.equal({applyToDatasets: false, purgeData: true, timezone: 'US/Eastern'})
  })

  it('sends timezone, purgeData and applyToDatasets', async () => {
    await runCommand(['data-source', 'set-timezone', '42', '--timezone', 'US/Eastern', '--apply-to-datasets'], {root: process.cwd()})
    expect(lastBody('PUT', '/v2/data-sources/42/timezone')).to.deep.equal({applyToDatasets: true, purgeData: false, timezone: 'US/Eastern'})
  })

  it('prints the updated data source with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'set-timezone', '42', '--timezone', 'US/Eastern', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })
})
