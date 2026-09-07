import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

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

  const content = fs.readFileSync(file, 'utf-8')
  return JSON.parse(content) as DataboxConfig
}

export function saveConfig(config: DataboxConfig): void {
  // The file holds a plaintext API key — keep it owner-only.
  fs.mkdirSync(getConfigDir(), {mode: 0o700, recursive: true})
  const file = getConfigPath()
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', {mode: 0o600})
  // writeFileSync's mode applies only when creating the file; enforce it either way.
  fs.chmodSync(file, 0o600)
}
