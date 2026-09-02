import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('databoard metrics', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/databoards/1/metrics',
        response: {
          status: 'success',
          requestId: 'test',
          data: {blocks: [{id: 10, name: 'Sessions', visualizationType: 'line', metrics: []}]},
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets databoard metrics', async () => {
    const {stdout} = await runCommand(['databoard', 'metrics', '1'], {root: process.cwd()})
    expect(stdout).to.include('Sessions')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['databoard', 'metrics', '1', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.blocks).to.have.lengthOf(1)
    expect(parsed.blocks[0].name).to.equal('Sessions')
  })
})
