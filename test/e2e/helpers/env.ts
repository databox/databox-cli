import {E2eEnvironment, knownEnvironmentNames, resolveEnvironment} from './environments.js'

export interface E2eConfig {
  /** Sent as x-account-id on every command. Optional. */
  accountId?: string
  /** Gates the analyze/ask-genie suite — it targets a separate service. */
  agenticUrl?: string
  allowInsecureTls: boolean
  environment: E2eEnvironment
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
          .filter((name) => resolveEnvironment({DATABOX_E2E_ENV: name}).keyResolvedFrom === 'environment default')
          .join(', ')}.`,
      ].join('\n'),
    )
  }

  const lines = [
    'databox-cli e2e',
    `  environment : ${environment.name}${environment.isProduction ? '  ** PRODUCTION **' : ''}`,
    `  api url     : ${environment.baseUrl}`,
    `  api key     : from ${environment.keyResolvedFrom}`,
  ]
  if (accountId) lines.push(`  account id  : ${accountId}`)
  if (allowInsecureTls) lines.push('  tls         : verification DISABLED (DATABOX_E2E_ALLOW_INSECURE_TLS=1)')

  console.log(`\n${lines.join('\n')}\n`)

  return config
}
