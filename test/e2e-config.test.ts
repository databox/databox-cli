import {expect} from 'chai'

import {preflight, resetConfig} from './e2e/helpers/env.js'
import {resolveEnvironment} from './e2e/helpers/environments.js'

/**
 * The e2e target resolver is pure, and its guards are the only thing standing
 * between a stray env var and a destructive run against production — so it is
 * covered here, in the fast suite, rather than by manual inspection.
 */
describe('e2e environment resolution', () => {
  const KEY = 'test-key'

  it('takes the URL and key verbatim from the environment', () => {
    const env = resolveEnvironment({
      DATABOX_E2E_API_KEY: KEY,
      DATABOX_E2E_API_URL: 'https://ingestion-api-pr-482.databox.com/',
    })

    expect(env.baseUrl).to.equal('https://ingestion-api-pr-482.databox.com')
    expect(env.apiKey).to.equal(KEY)
    expect(env.keySource).to.equal('env')
    expect(env.isProduction).to.be.false
  })

  it('resolves to an empty URL and key when neither is set — there are no defaults', () => {
    const env = resolveEnvironment({})

    expect(env.baseUrl).to.be.empty
    expect(env.apiKey).to.be.empty
    expect(env.keySource).to.equal('none')
    expect(env.isProduction).to.be.false
  })

  it('ignores the retired DATABOX_E2E_ENV', () => {
    const env = resolveEnvironment({DATABOX_E2E_ENV: 'production'})

    expect(env.baseUrl).to.be.empty
    expect(env.isProduction).to.be.false
  })

  it('flags production by the URL host', () => {
    expect(resolveEnvironment({DATABOX_E2E_API_URL: 'https://api.databox.com'}).isProduction).to.be.true
    expect(resolveEnvironment({DATABOX_E2E_API_URL: 'https://api.databox.com/'}).isProduction).to.be.true
    expect(resolveEnvironment({DATABOX_E2E_API_URL: 'https://api.databox.com.'}).isProduction).to.be.true
    expect(resolveEnvironment({DATABOX_E2E_API_URL: 'http://localhost:5152'}).isProduction).to.be.false
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

  it('fails naming DATABOX_E2E_API_URL when the URL is missing', () => {
    process.env.DATABOX_E2E_API_KEY = 'test-key'

    expect(() => preflight()).to.throw(/Not set: DATABOX_E2E_API_URL\./)
  })

  it('fails naming DATABOX_E2E_API_KEY when the key is missing', () => {
    process.env.DATABOX_E2E_API_URL = 'http://localhost:5152'

    expect(() => preflight()).to.throw(/Not set: DATABOX_E2E_API_KEY\./)
  })

  it('names both variables when neither is set', () => {
    expect(() => preflight()).to.throw(/Not set: DATABOX_E2E_API_URL, DATABOX_E2E_API_KEY\./)
  })

  it('refuses a production URL without DATABOX_E2E_ALLOW_PROD', () => {
    process.env.DATABOX_E2E_API_URL = 'https://api.databox.com'
    process.env.DATABOX_E2E_API_KEY = 'test-key'

    expect(() => preflight()).to.throw(/Refusing to run against PRODUCTION/)
  })

  it('runs against production once DATABOX_E2E_ALLOW_PROD=1 is set', () => {
    process.env.DATABOX_E2E_API_URL = 'https://api.databox.com'
    process.env.DATABOX_E2E_API_KEY = 'test-key'
    process.env.DATABOX_E2E_ALLOW_PROD = '1'

    expect(preflight().environment.isProduction).to.be.true
    expect(logged.join('\n')).to.include('** PRODUCTION **')
  })

  it('still requires a key for production once it is allowed', () => {
    process.env.DATABOX_E2E_API_URL = 'https://api.databox.com'
    process.env.DATABOX_E2E_ALLOW_PROD = '1'

    expect(() => preflight()).to.throw(/Not set: DATABOX_E2E_API_KEY\./)
  })

  it('passes with a URL and key, and reports the target without the key', () => {
    process.env.DATABOX_E2E_API_URL = 'http://localhost:5152'
    process.env.DATABOX_E2E_API_KEY = 'test-key-not-for-printing'

    const config = preflight()
    const banner = logged.join('\n')

    expect(config.environment.baseUrl).to.equal('http://localhost:5152')
    expect(banner).to.include('http://localhost:5152')
    expect(banner).to.include('from DATABOX_E2E_API_KEY')
    expect(banner).to.not.include('test-key-not-for-printing')
  })
})
