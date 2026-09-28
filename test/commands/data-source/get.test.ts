import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceDetail} from './fixtures.js'

describe('data-source get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/data-sources/42',
        response: envelope(dataSourceDetail),
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets data source details', async () => {
    const {stdout} = await runCommand(['data-source', 'get', '42'], {root: process.cwd()})
    expect(stdout).to.include('My Source')
    expect(stdout).to.include('42')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'get', '42', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(dataSourceDetail)
  })
})
