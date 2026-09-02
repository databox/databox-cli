import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source set-timezone', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PUT',
        path: '/v2/data-sources/42/timezone',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('sets timezone', async () => {
    const {stdout} = await runCommand(['data-source', 'set-timezone', '42', '--timezone', 'US/Eastern'], {root: process.cwd()})
    expect(stdout).to.include('Timezone set')
  })
})
