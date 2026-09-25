import {expect} from 'chai'

import {describeTarget} from './e2e/helpers/env.js'
import {E2eEnvironment, resolveEnvironment, targetOf} from './e2e/helpers/environments.js'

/**
 * The e2e preflight prints a banner describing the target. It must never print the API
 * key, and that has to hold by construction rather than by care — describeTarget takes
 * an E2eTarget, which carries no credential, and renders the key's provenance from a
 * closed set of literals.
 *
 * CodeQL flags this path (js/clear-text-logging); these assertions are the guarantee
 * that does not depend on a scanner agreeing with us.
 */
function bannerFor(processEnv: NodeJS.ProcessEnv): string {
  const environment = resolveEnvironment(processEnv)
  return describeTarget(targetOf(environment), {insecureTls: false}).join('\n')
}

describe('e2e preflight banner', () => {
  const SECRET = 'test-secret-key-0000'

  it('never prints a key supplied through the environment', () => {
    const banner = bannerFor({DATABOX_E2E_API_KEY: SECRET})

    expect(banner).to.not.contain(SECRET)
    expect(banner).to.contain('from DATABOX_E2E_API_KEY')
  })

  it('says when no key is set', () => {
    expect(bannerFor({DATABOX_E2E_API_URL: 'http://localhost:5152'})).to.contain('not set')
  })

  it('targetOf drops the credential at runtime, not just in the type', () => {
    const environment = resolveEnvironment({DATABOX_E2E_API_KEY: SECRET})
    const target = targetOf(environment)

    // A spread would have carried apiKey through while still type-checking.
    expect(Object.keys(target)).to.not.include('apiKey')
    expect(JSON.stringify(target)).to.not.contain(SECRET)
  })

  it('describeTarget cannot be handed the credential', () => {
    // Compile-time: E2eTarget has no apiKey, so the key is not in scope inside
    // describeTarget. Runtime: even passing a full environment prints no key.
    const environment: E2eEnvironment = resolveEnvironment({DATABOX_E2E_API_KEY: SECRET})
    const banner = describeTarget(environment, {insecureTls: false}).join('\n')

    expect(banner).to.not.contain(SECRET)
  })

  it('still reports the target and flags production', () => {
    const banner = bannerFor({DATABOX_E2E_API_KEY: SECRET, DATABOX_E2E_API_URL: 'https://api.databox.com'})

    expect(banner).to.contain('https://api.databox.com')
    expect(banner).to.contain('** PRODUCTION **')
  })
})
