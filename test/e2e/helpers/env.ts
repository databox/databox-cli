import {E2eEnvironment, E2eTarget, KeySource, knownEnvironmentNames, resolveEnvironment, targetOf} from './environments.js'

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

    case 'default': {
      return 'from the environment default'
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
    `  environment : ${target.name}${target.isProduction ? '  ** PRODUCTION **' : ''}`,
    `  api url     : ${target.baseUrl}`,
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

  if (!environment.apiKey) {
    throw new Error(
      [
        '',
        `No API key for environment "${environment.name}" (${environment.baseUrl}).`,
        'Set DATABOX_E2E_API_KEY to a key valid for that environment.',
        `Environments with a built-in default key: ${knownEnvironmentNames()
          .filter((name) => resolveEnvironment({DATABOX_E2E_ENV: name}).keySource === 'default')
          .join(', ')}.`,
      ].join('\n'),
    )
  }

  const lines = describeTarget(targetOf(environment), {accountId, insecureTls: allowInsecureTls})
  console.log(`\n${lines.join('\n')}\n`)

  return config
}
