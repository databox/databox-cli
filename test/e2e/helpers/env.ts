import {
  E2eEnvironment, E2eTarget, KeySource, resolveEnvironment, targetOf,
} from './environments.js'

export interface E2eConfig {
  /** Sent as x-account-id on every command. Optional. */
  accountId?: string
  /** Gates the analyze/ask-genie suite — it targets a separate service. */
  agenticUrl?: string
  allowInsecureTls: boolean
  environment: E2eEnvironment
}

/**
 * Every branch returns a literal, so no value from the resolved config can reach the
 * banner through this. Exhaustive over KeySource.
 */
function describeKeySource(source: KeySource): string {
  switch (source) {
  case 'env': {
    return 'from DATABOX_E2E_API_KEY'
  }

  case 'none': {
    return 'not set'
  }
  }
}

/**
 * Builds the preflight banner.
 *
 * Takes an E2eTarget, never an E2eEnvironment: the credential is not in scope here, so
 * it cannot be printed — the guarantee is structural rather than a matter of care. The
 * key's provenance arrives as a tag and is rendered to a literal above.
 */
export function describeTarget(target: E2eTarget, extras: {accountId?: string; insecureTls: boolean}): string[] {
  const lines = [
    'databox-cli e2e',
    `  api url     : ${target.baseUrl}${target.isProduction ? '  ** PRODUCTION **' : ''}`,
    `  api key     : ${describeKeySource(target.keySource)}`,
  ]

  if (extras.accountId) lines.push(`  account id  : ${extras.accountId}`)
  if (extras.insecureTls) {
    lines.push('  tls         : verification DISABLED (DATABOX_E2E_ALLOW_INSECURE_TLS=1)')
  }

  return lines
}

let cached: E2eConfig | undefined

function readConfig(): E2eConfig {
  return {
    accountId: process.env.DATABOX_E2E_ACCOUNT_ID?.trim() || undefined,
    agenticUrl: process.env.DATABOX_E2E_AGENTIC_URL?.trim() || undefined,
    allowInsecureTls: process.env.DATABOX_E2E_ALLOW_INSECURE_TLS === '1',
    environment: resolveEnvironment(),
  }
}

/**
 * The resolved run configuration. Memoized so every command in a run targets the
 * same place even if the ambient environment is mutated mid-run.
 */
export function getConfig(): E2eConfig {
  cached ||= readConfig()
  return cached
}

/** Test-only: forget the memoized config so a new environment can be resolved. */
export function resetConfig(): void {
  cached = undefined
}

/**
 * Validates the run configuration and prints the target banner. Throws with an
 * actionable message rather than letting a misconfigured run reach the network.
 */
export function preflight(): E2eConfig {
  const config = getConfig()
  const {accountId, allowInsecureTls, environment} = config

  const missing = [
    environment.baseUrl ? undefined : 'DATABOX_E2E_API_URL',
    environment.apiKey ? undefined : 'DATABOX_E2E_API_KEY',
  ].filter(name => name !== undefined)

  if (missing.length > 0) {
    throw new Error(
      [
        '',
        `Not set: ${missing.join(', ')}.`,
        'The e2e suite needs both DATABOX_E2E_API_URL (the API base URL) and DATABOX_E2E_API_KEY',
        '(a key valid for it). No key is built in — this repository is public.',
      ].join('\n'),
    )
  }

  if (environment.isProduction && process.env.DATABOX_E2E_ALLOW_PROD !== '1') {
    throw new Error(
      [
        '',
        `Refusing to run against PRODUCTION (${environment.baseUrl}).`,
        'These suites create and delete real data sources, datasets, metrics and users.',
        'If that is genuinely what you want, set DATABOX_E2E_ALLOW_PROD=1.',
      ].join('\n'),
    )
  }

  const lines = describeTarget(targetOf(environment), {accountId, insecureTls: allowInsecureTls})
  console.log(`\n${lines.join('\n')}\n`)

  return config
}
