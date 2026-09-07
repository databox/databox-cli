import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupEmptyConfig,
} from '../../helpers.js'

describe('auth login', () => {
  // `auth login` calls saveConfig for real — without a throwaway HOME it writes the
  // developer's own ~/.config/databox-cli/config.json.
  beforeEach(() => {
    setupEmptyConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('saves API key and validates successfully', async () => {
    mockApi([
      {
        method: 'GET',
        path: '/v2/auth/validate-key',
        response: {data: {}, requestId: 'test', status: 'success'},
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
        response: {errors: [{message: 'Invalid API key'}], requestId: 'test', status: 'error'},
        status: 401,
      },
    ])

    const result = await runCommand(['auth', 'login', '--api-key', 'bad-key'], {root: process.cwd()})

    expect(result.stderr).to.contain('API key could not be validated')
  })
})
