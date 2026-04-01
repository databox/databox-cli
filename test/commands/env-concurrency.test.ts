import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, restoreApi, setupTestConfig} from '../helpers.js'

describe('env var concurrency', () => {
  let originalFetch: typeof global.fetch
  let capturedKeys: string[]

  beforeEach(() => {
    capturedKeys = []
    originalFetch = global.fetch

    global.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined
      const apiKey = headers?.['x-api-key'] ?? 'unknown'
      capturedKeys.push(apiKey)

      return new Response(JSON.stringify({status: 'ok'}), {
        headers: {'Content-Type': 'application/json'},
        status: 200,
      })
    }) as typeof global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    restoreApi()
    cleanupTestConfig()
  })

  it('--api-key flag works without config file', async () => {
    cleanupTestConfig()

    const result = await runCommand(['auth', 'validate', '--api-key', 'flag-key'], {root: process.cwd()})

    expect(result.error).to.be.undefined
    expect(capturedKeys).to.have.lengthOf(1)
    expect(capturedKeys[0]).to.equal('flag-key')
  })

  it('--api-key flag overrides config file value', async () => {
    setupTestConfig('config-file-key')

    const result = await runCommand(['auth', 'validate', '--api-key', 'override-key'], {root: process.cwd()})

    expect(result.error).to.be.undefined
    expect(capturedKeys).to.have.lengthOf(1)
    expect(capturedKeys[0]).to.equal('override-key')
  })

  it('sequential commands with different --api-key flags use their own keys', async () => {
    cleanupTestConfig()

    const r1 = await runCommand(['auth', 'validate', '--api-key', 'key-alpha'], {root: process.cwd()})
    const r2 = await runCommand(['auth', 'validate', '--api-key', 'key-beta'], {root: process.cwd()})
    const r3 = await runCommand(['auth', 'validate', '--api-key', 'key-gamma'], {root: process.cwd()})

    expect(r1.error).to.be.undefined
    expect(r2.error).to.be.undefined
    expect(r3.error).to.be.undefined

    expect(capturedKeys).to.have.lengthOf(3)
    expect(capturedKeys[0]).to.equal('key-alpha')
    expect(capturedKeys[1]).to.equal('key-beta')
    expect(capturedKeys[2]).to.equal('key-gamma')
  })

  it('different api keys do not leak between commands', async () => {
    cleanupTestConfig()

    // Each command gets its own api key — verify no cross-contamination
    const r1 = await runCommand(['auth', 'validate', '--api-key', 'process-a-key'], {root: process.cwd()})
    expect(r1.error).to.be.undefined
    expect(capturedKeys).to.deep.equal(['process-a-key'])

    const r2 = await runCommand(['auth', 'validate', '--api-key', 'process-b-key'], {root: process.cwd()})
    expect(r2.error).to.be.undefined
    expect(capturedKeys).to.deep.equal(['process-a-key', 'process-b-key'])
  })
})
