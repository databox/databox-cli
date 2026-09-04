import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset modification-rules', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/modifications/rules', response: {status: 'success', requestId: 'test', data: {rules: ['rename', 'filter']}}}])
  })
  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('lists modification rules', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-rules'])
    expect(stdout).to.include('rename')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'modification-rules', '--json'])
    const json = JSON.parse(stdout)
    expect(json.rules).to.deep.equal(['rename', 'filter'])
  })
})
