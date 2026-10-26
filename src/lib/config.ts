import {Errors} from '@oclif/core'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import {describeInvalidStoredApiUrl, normalizeApiUrl} from './api-client.js'

export interface DataboxConfig {
  apiKey?: string
  apiUrl?: string
}

// Resolved per call rather than at module load, so a caller with its own HOME — the
// test harness, in particular — is never pointed at the real developer config.
function getConfigDir(): string {
  return path.join(os.homedir(), '.config', 'databox-cli')
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json')
}

export function loadConfig(): DataboxConfig {
  const file = getConfigPath()
  if (!fs.existsSync(file)) {
    return {}
  }

  const content = fs.readFileSync(file, 'utf8')
  try {
    return JSON.parse(content) as DataboxConfig
  } catch {
    // The parser's message quotes the text around the error, which can be part of the key,
    // so it is dropped. Login reads this file too, so it cannot recover it in place.
    throw new Errors.CLIError(`Config file ${file} is not valid JSON. Delete it and run "databox auth login" again.`, {exit: 1})
  }
}

/**
 * The stored apiUrl as the canonical base URL, or undefined when none is stored. A hand-edited
 * `null` counts as none. Anything else normalizeApiUrl() refuses is the stored config at fault, so it
 * fails with exit 1, like an unreadable config. Shared by BaseCommand and auth login.
 */
export function storedApiUrl(config: DataboxConfig): string | undefined {
  const value: unknown = config.apiUrl
  if (value === undefined || value === null) return undefined

  const url = typeof value === 'string' ? normalizeApiUrl(value) : undefined
  if (url === undefined) throw new Errors.CLIError(describeInvalidStoredApiUrl(value, getConfigPath()), {exit: 1})
  return url
}

export function saveConfig(config: DataboxConfig): void {
  // The file holds a plaintext API key — keep it owner-only.
  fs.mkdirSync(getConfigDir(), {mode: 0o700, recursive: true})
  const file = getConfigPath()
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', {mode: 0o600})
  // writeFileSync's mode applies only when creating the file; enforce it either way.
  fs.chmodSync(file, 0o600)
}
