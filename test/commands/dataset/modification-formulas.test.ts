import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset modification-formulas', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/modifications/formulas', response: {data: {items: [{name: 'SUM'}]}, requestId: 'test', status: 'success'}}])
  })
  afterEach(() => {
    cleanupTestConfig()
    restoreApi()
  })

  it('lists modification formulas', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-formulas'])
    expect(stdout).to.include('SUM')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-formulas', '--json'])
    const json = JSON.parse(stdout)
    expect(json.items[0].name).to.equal('SUM')
  })
})
