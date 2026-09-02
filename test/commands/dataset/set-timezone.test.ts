import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-timezone', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PUT', path: '/v2/datasets/123/timezone', response: {status: 'success', requestId: 'test', data: {}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets timezone', async () => {
    const {stdout} = await runCommand(['dataset', 'set-timezone', '123', '--timezone', 'US/Eastern'], {root: process.cwd()})
    expect(stdout).to.include('Timezone set')
  })
})
