import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi} from '../../helpers.js'

describe('auth login', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('saves API key and validates successfully', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {status: 'success', requestId: 'test', data: {}},
      },
    ])

    const result = await runCommand(['auth', 'login', '--api-key', 'my-test-key'], {root: process.cwd()})

    expect(result.stdout).to.contain('Authenticated successfully.')
  })

  it('saves API key and warns on validation failure', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {status: 'error', requestId: 'test', errors: [{message: 'Invalid API key'}]},
        status: 401,
      },
    ])

    const result = await runCommand(['auth', 'login', '--api-key', 'bad-key'], {root: process.cwd()})

    expect(result.stderr).to.contain('API key could not be validated')
  })
})
