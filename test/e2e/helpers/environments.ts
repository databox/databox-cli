/**
 * The e2e target, read from the environment.
 *
 * There are no named environments and no built-in keys: this repository is public, so
 * every run names its target with DATABOX_E2E_API_URL and supplies its credential with
 * DATABOX_E2E_API_KEY. `resolveEnvironment()` is the single seam that reads them.
 */

/** Where the key came from. A tag, resolved to display text by describeTarget(). */
export type KeySource = 'env' | 'none'

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
  }
}

const PRODUCTION_HOSTNAMES = new Set(['api.databox.com'])

export function isProductionUrl(baseUrl: string): boolean {
  try {
    // A trailing dot is the same host to DNS, so it must not get past the production guard.
    return PRODUCTION_HOSTNAMES.has(new URL(baseUrl).hostname.replace(/\.$/, ''))
  } catch {
    return false
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Resolves the target from the environment. Pure and total — it never throws on a
 * missing URL or key, so callers can report every problem at once. `preflight()` in
 * ./env.ts is what validates and aborts.
 */
export function resolveEnvironment(processEnv: NodeJS.ProcessEnv = process.env): E2eEnvironment {
  const baseUrl = normalizeBaseUrl(processEnv.DATABOX_E2E_API_URL?.trim() ?? '')
  const apiKey = processEnv.DATABOX_E2E_API_KEY?.trim() ?? ''

  return {
    apiKey, baseUrl, isProduction: isProductionUrl(baseUrl), keySource: apiKey ? 'env' : 'none',
  }
}
