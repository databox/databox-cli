import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('auth validate', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows valid message on success', async () => {
    setupTestConfig('test-api-key')
    mockApi([
      {
        method: 'GET',
        path: '/v1/auth/validate-key',
        response: {status: 'ok'},
      },
    ])

    const result = await runCommand(['auth', 'validate'], {root: process.cwd()})

    expect(result.stdout).to.contain('API key is valid.')
  })

  it('outputs JSON when --json flag is used', async () => {
    setupTestConfig('test-api-key')
    mockApi([
      {
        method: 'GET',
        path: '/v1/auth/validate-key',
        response: {status: 'ok'},
      },
    ])

    const result = await runCommand(['auth', 'validate', '--json'], {root: process.cwd()})

    const parsed = JSON.parse(result.stdout)
    expect(parsed).to.deep.equal({status: 'ok'})
  })

  it('errors when not authenticated', async () => {
    cleanupTestConfig()

    const result = await runCommand(['auth', 'validate'], {root: process.cwd()})

    expect(result.error?.message).to.contain('Not authenticated')
  })
})
