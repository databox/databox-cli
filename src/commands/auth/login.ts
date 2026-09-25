import {Command, Flags} from '@oclif/core'

import {ApiClient} from '../../lib/api-client.js'
import {loadConfig, saveConfig} from '../../lib/config.js'
import {prompt, readPipedLine} from '../../lib/prompt.js'

export default class Login extends Command {
  static description = 'Authenticate with Databox by providing your API key'

  static examples = [
    '<%= config.bin %> auth login',
    '<%= config.bin %> auth login --api-key YOUR_KEY',
    'pass show databox | <%= config.bin %> auth login',
  ]

  static flags = {
    'api-key': Flags.string({
      description: 'API key. If omitted, you are prompted at a terminal; otherwise the first line of stdin is read',
    }),
    'api-url': Flags.string({
      description: 'Override the API base URL',
      env: 'DATABOX_API_URL',
      hidden: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Login)

    let apiKey = flags['api-key']
    const apiUrl = flags['api-url']

    // Off a terminal there is nobody to prompt, but the key can be piped in
    // (`pass show databox | databox auth login`). An empty first line or no input is refused.
    if (!apiKey && !process.stdin.isTTY) {
      apiKey = await readPipedLine('Enter your API key')
      if (!apiKey) {
        this.error(
          'No API key provided: stdin is not a terminal and nothing was piped. '
          + 'Pass --api-key, pipe the key in, or skip auth login and set DATABOX_API_KEY.',
          {exit: 2},
        )
      }
    }

    if (!apiKey) {
      apiKey = await prompt('Enter your API key', {mask: true})
    }

    if (!apiKey) {
      this.error('API key is required.', {exit: 1})
    }

    const existingConfig = loadConfig()
    const baseUrl = apiUrl ?? existingConfig.apiUrl
    saveConfig({...existingConfig, apiKey, apiUrl: baseUrl})

    try {
      const client = new ApiClient({apiKey, baseUrl})
      await client.get('/v2/auth/validate-key')
      this.log('Authenticated successfully.')
    } catch {
      this.warn('API key could not be validated.')
    }
  }
}
