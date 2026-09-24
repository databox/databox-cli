import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'

/**
 * AccountResponse.cs `AccountUsageResponse`, published as `OrganizationUsageResponse`: buckets are
 * {count, limit}, limit null when unlimited.
 */
const usage = {
  accounts: {count: 0, limit: null},
  aiCredits: {
    limit: 100, remaining: 87.5, resetsAt: '2026-10-01T00:00:00+00:00', state: 'ok', used: 12.5,
  },
  dataSources: {count: 5, limit: 50},
  users: {count: 2, limit: 10},
}

function mockUsage(data: unknown): void {
  mockApi([{method: 'GET', path: '/v2/organization/usage', response: {data, requestId: 'test', status: 'success'}}])
}

describe('organization usage', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('renders each figure on a readable line', async () => {
    mockUsage(usage)
    const {stdout} = await runCommand(['organization', 'usage'], {root: process.cwd()})
    expect(stdout.trim().split('\n')).to.deep.equal([
      'Users: 2 of 10',
      'Data sources: 5 of 50',
      'Accounts: 0 of unlimited',
      'AI credits used: 12.5',
      'AI credits limit: 100',
      'AI credits remaining: 87.5',
      'AI credits state: ok',
      'AI credits reset at: 2026-10-01T00:00:00+00:00',
    ])
  })

  it('reports unlimited AI credits', async () => {
    mockUsage({
      ...usage,
      aiCredits: {
        limit: null, remaining: null, resetsAt: null, state: 'ok', used: 3,
      },
    })
    const {stdout} = await runCommand(['organization', 'usage'], {root: process.cwd()})
    expect(stdout).to.contain('AI credits limit: unlimited')
    expect(stdout).to.contain('AI credits remaining: unlimited')
  })

  // Null means the credits read failed, not that none were used.
  it('says the AI credits are unavailable when aiCredits is null', async () => {
    mockUsage({...usage, aiCredits: null})
    const {stdout} = await runCommand(['organization', 'usage'], {root: process.cwd()})
    expect(stdout).to.contain('Users: 2 of 10')
    expect(stdout).to.contain('AI credits: unavailable')
    expect(stdout).to.not.contain('AI credits used')
  })

  it('outputs the whole response with --json', async () => {
    mockUsage(usage)
    const {stdout} = await runCommand(['organization', 'usage', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(usage)
  })

  it('keeps a null aiCredits under --json', async () => {
    mockUsage({...usage, aiCredits: null})
    const {stdout} = await runCommand(['organization', 'usage', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout).aiCredits).to.equal(null)
  })
})
