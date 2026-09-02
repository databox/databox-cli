import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset modifications', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/modifications',
      response: {status: 'success', requestId: 'test', data: [{id: 1, columnId: 'revenue', type: 'rename'}]},
    }])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('lists modifications', async () => {
    const {stdout} = await runCommand(['dataset', 'modifications', '123'], {root: process.cwd()})
    expect(stdout).to.include('rename')
  })
})
