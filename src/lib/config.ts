import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

export interface DataboxConfig {
  apiKey?: string
  apiUrl?: string
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'databox-cli')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export function getConfigPath(): string {
  return CONFIG_FILE
}

export function loadConfig(): DataboxConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {}
  }

  const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
  return JSON.parse(content) as DataboxConfig
}

export function saveConfig(config: DataboxConfig): void {
  fs.mkdirSync(CONFIG_DIR, {recursive: true})
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n')
}
