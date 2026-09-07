import {expect} from 'chai'

import {preflight, resetConfig} from './e2e/helpers/env.js'
import {DEFAULT_ENVIRONMENT, resolveEnvironment} from './e2e/helpers/environments.js'

/**
 * The e2e target resolver is pure, and its guards are the only thing standing
 * between a stray env var and a destructive run against production — so it is
 * covered here, in the fast suite, rather than by manual inspection.
 */
describe('e2e environment resolution', () => {
  it('defaults to develop6 with its built-in key', () => {
    const env = resolveEnvironment({})

    expect(env.name).to.equal(DEFAULT_ENVIRONMENT)
    expect(env.baseUrl).to.equal('https://ingestion-api-develop6.databox.com')
    expect(env.apiKeyOrigin).to.equal('environment default')
    expect(env.apiKey).to.not.be.empty
    expect(env.isProduction).to.be.false
  })

  it('resolves a named environment from the registry', () => {
    const env = resolveEnvironment({DATABOX_E2E_ENV: 'develop10'})

    expect(env.baseUrl).to.equal('https://ingestion-api-develop10.databox.com')
    expect(env.apiKeyOrigin).to.equal('none')
    expect(env.apiKey).to.be.empty
  })

  it('derives a hostname for an environment not in the registry', () => {
    const env = resolveEnvironment({DATABOX_E2E_ENV: 'royal-salmon-marsh'})

    expect(env.name).to.equal('royal-salmon-marsh')
    expect(env.baseUrl).to.equal('https://ingestion-api-royal-salmon-marsh.databox.com')
    expect(env.apiKeyOrigin).to.equal('none')
  })

  it('rejects an environment name that cannot be a hostname', () => {
    expect(() => resolveEnvironment({DATABOX_E2E_ENV: 'Not A Name'})).to.throw(/Invalid DATABOX_E2E_ENV/)
  })

  it('uses an explicit URL verbatim, overriding the environment name', () => {
    const env = resolveEnvironment({
      DATABOX_E2E_API_URL: 'https://ingestion-api-pr-482.databox.com/',
      DATABOX_E2E_ENV: 'develop10',
    })

    expect(env.name).to.equal('custom')
    expect(env.baseUrl).to.equal('https://ingestion-api-pr-482.databox.com')
  })

  it('adopts the registry identity when an explicit URL names a known environment', () => {
    const env = resolveEnvironment({DATABOX_E2E_API_URL: 'http://localhost:5152'})

    expect(env.name).to.equal('local')
    expect(env.apiKeyOrigin).to.equal('environment default')
  })

  it('lets DATABOX_E2E_API_KEY override a built-in default', () => {
    const env = resolveEnvironment({DATABOX_E2E_API_KEY: 'pak_override'})

    expect(env.name).to.equal(DEFAULT_ENVIRONMENT)
    expect(env.apiKey).to.equal('pak_override')
    expect(env.apiKeyOrigin).to.equal('DATABOX_E2E_API_KEY')
  })

  it('flags production by resolved host, however it was selected', () => {
    expect(resolveEnvironment({DATABOX_E2E_ENV: 'production'}).isProduction).to.be.true
    expect(resolveEnvironment({DATABOX_E2E_API_URL: 'https://api.databox.com'}).isProduction).to.be.true
  })

  it('gives production no default key', () => {
    expect(resolveEnvironment({DATABOX_E2E_ENV: 'production'}).apiKey).to.be.empty
  })
})

describe('e2e preflight guards', () => {
  const saved = {...process.env}
  let logged: string[] = []
  let originalLog: typeof console.log

  beforeEach(() => {
    resetConfig()
    logged = []
    originalLog = console.log
    console.log = (...args: unknown[]) => {
      logged.push(args.join(' '))
    }

    for (const key of Object.keys(process.env)) {
      if (key.startsWith('DATABOX_')) delete process.env[key]
    }
  })

  afterEach(() => {
    console.log = originalLog
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('DATABOX_')) delete process.env[key]
    }

    for (const [key, value] of Object.entries(saved)) {
      if (key.startsWith('DATABOX_') && value !== undefined) process.env[key] = value
    }

    resetConfig()
  })

  it('refuses production without DATABOX_E2E_ALLOW_PROD', () => {
    process.env.DATABOX_E2E_ENV = 'production'
    process.env.DATABOX_E2E_API_KEY = 'pak_whatever'

    expect(() => preflight()).to.throw(/Refusing to run against PRODUCTION/)
  })

  it('refuses production reached by an explicit URL', () => {
    process.env.DATABOX_E2E_API_URL = 'https://api.databox.com'
    process.env.DATABOX_E2E_API_KEY = 'pak_whatever'

    expect(() => preflight()).to.throw(/Refusing to run against PRODUCTION/)
  })

  it('still requires a key for production once it is allowed', () => {
    process.env.DATABOX_E2E_ENV = 'production'
    process.env.DATABOX_E2E_ALLOW_PROD = '1'

    expect(() => preflight()).to.throw(/DATABOX_E2E_API_KEY/)
  })

  it('requires a key for an environment that has no default', () => {
    process.env.DATABOX_E2E_ENV = 'develop10'

    expect(() => preflight()).to.throw(/No API key for environment "develop10"/)
  })

  it('passes on the default environment and reports the target without the key', () => {
    const config = preflight()
    const banner = logged.join('\n')

    expect(config.environment.name).to.equal(DEFAULT_ENVIRONMENT)
    expect(banner).to.include(DEFAULT_ENVIRONMENT)
    expect(banner).to.include('https://ingestion-api-develop6.databox.com')
    expect(banner).to.include('from environment default')
    expect(banner).to.not.include(config.environment.apiKey)
  })
})
