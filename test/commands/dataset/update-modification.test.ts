import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset update-modification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/modifications', response: {status: 'success', requestId: 'test', data: {id: 1}}}])
  })
  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('updates a modification', async () => {
    const {stdout} = await runCommand(['dataset', 'update-modification', '123', '--data', '{"rules":{}}'])
    expect(stdout).to.include('1')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'update-modification', '123', '--data', '{"rules":{}}', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.id).to.equal(1)
  })
})
