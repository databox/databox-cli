/**
 * Named target environments for the e2e suite.
 *
 * The registry below is a literal for now. When environments become dynamic,
 * `resolveEnvironment()` is the single seam that changes — no suite touches
 * anything else in this file.
 */

/** Where the key came from. A tag, resolved to display text by describeTarget(). */
export type KeySource = 'default' | 'env' | 'none'

/**
 * The parts of a resolved environment that are safe to print.
 *
 * Separate from the key on purpose: anything that renders or logs takes an E2eTarget,
 * so the credential is not in scope and cannot be leaked into output by accident.
 */
export interface E2eTarget {
  baseUrl: string
  isProduction: boolean
  keySource: KeySource
  name: string
}

export interface E2eEnvironment extends E2eTarget {
  apiKey: string
}

/**
 * Copies out just the printable fields. An explicit construction rather than a spread,
 * so the returned object provably holds no credential at runtime — not merely a type
 * that hides one.
 */
export function targetOf(environment: E2eEnvironment): E2eTarget {
  return {
    baseUrl: environment.baseUrl,
    isProduction: environment.isProduction,
    keySource: environment.keySource,
    name: environment.name,
  }
}

interface EnvironmentDefinition {
  baseUrl: string
  /** Convenience default so the common case runs with no setup. Never set for production. */
  defaultApiKey?: string
}

/** Shared by develop6 and its local port-forward, per ingestion-api's ExternalTests/v2 helper. */
const DEVELOP6_API_KEY = 'pak_96bd2376-80cc-4c73-9e96-99baa0149267'

const KNOWN_ENVIRONMENTS: Record<string, EnvironmentDefinition> = {
  develop6: {baseUrl: 'https://ingestion-api-develop6.databox.com', defaultApiKey: DEVELOP6_API_KEY},
  develop10: {baseUrl: 'https://ingestion-api-develop10.databox.com'},
  local: {baseUrl: 'http://localhost:5152', defaultApiKey: DEVELOP6_API_KEY},
  production: {baseUrl: 'https://api.databox.com'},
}

export const DEFAULT_ENVIRONMENT = 'develop6'

const PRODUCTION_HOSTNAMES = new Set(['api.databox.com'])

/** Environment names we are willing to turn into a hostname. */
const DYNAMIC_NAME_PATTERN = /^[a-z\d][a-z\d-]*$/

export function knownEnvironmentNames(): string[] {
  return Object.keys(KNOWN_ENVIRONMENTS).sort()
}

export function isProductionUrl(baseUrl: string): boolean {
  try {
    return PRODUCTION_HOSTNAMES.has(new URL(baseUrl).hostname)
  } catch {
    return false
  }
}

/** Hostname convention for environments not in the registry (ephemeral, per-PR, ...). */
function deriveBaseUrl(name: string): string {
  return `https://ingestion-api-${name}.databox.com`
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Resolves the target from the environment. Pure and total — it never throws on a
 * missing key, so callers can report every problem at once. `preflight()` in
 * ./env.ts is what validates and aborts.
 */
export function resolveEnvironment(processEnv: NodeJS.ProcessEnv = process.env): E2eEnvironment {
  const explicitUrl = processEnv.DATABOX_E2E_API_URL?.trim()
  const requestedName = processEnv.DATABOX_E2E_ENV?.trim()

  let name: string
  let baseUrl: string
  let defaultApiKey: string | undefined

  if (explicitUrl) {
    // An explicit URL wins over DATABOX_E2E_ENV and is used verbatim. If it happens to
    // name a known environment, adopt that environment's identity and default key.
    baseUrl = normalizeBaseUrl(explicitUrl)
    const match = Object.entries(KNOWN_ENVIRONMENTS).find(([, def]) => normalizeBaseUrl(def.baseUrl) === baseUrl)
    name = match ? match[0] : 'custom'
    defaultApiKey = match?.[1].defaultApiKey
  } else {
    name = requestedName || DEFAULT_ENVIRONMENT
    const known = KNOWN_ENVIRONMENTS[name]

    if (known) {
      baseUrl = normalizeBaseUrl(known.baseUrl)
      defaultApiKey = known.defaultApiKey
    } else {
      if (!DYNAMIC_NAME_PATTERN.test(name)) {
        throw new Error(
          `Invalid DATABOX_E2E_ENV "${name}". Use one of: ${knownEnvironmentNames().join(', ')}, ` +
            'a lowercase environment name, or set DATABOX_E2E_API_URL to a full URL.',
        )
      }

      // A dynamic environment carries no default key — it must be supplied.
      baseUrl = deriveBaseUrl(name)
    }
  }

  const explicitKey = processEnv.DATABOX_E2E_API_KEY?.trim()
  const apiKey = explicitKey || defaultApiKey || ''

  let keySource: KeySource = 'none'
  if (explicitKey) {
    keySource = 'env'
  } else if (defaultApiKey) {
    keySource = 'default'
  }

  return {apiKey, baseUrl, isProduction: isProductionUrl(baseUrl), keySource, name}
}
