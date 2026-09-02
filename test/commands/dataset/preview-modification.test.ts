import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset preview-modification', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'POST', path: '/v2/datasets/123/modifications/preview', response: {status: 'success', requestId: 'test', data: {items: [], pagination: {page: 0, pageSize: 25, totalItems: 0}}}}])
  })
  afterEach(() => { cleanupTestConfig(); restoreApi() })

  it('previews a modification', async () => {
    const {stdout} = await runCommand(['dataset', 'preview-modification', '123', '--data', '{"rules":{}}'])
    expect(stdout).to.include('Items')
  })
})
