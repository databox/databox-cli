import {Command, Flags} from '@oclif/core'

import {ApiClient} from '../../lib/api-client.js'
import {loadConfig, saveConfig} from '../../lib/config.js'
import {prompt} from '../../lib/prompt.js'

export default class Login extends Command {
  static description = 'Authenticate with Databox by providing your API key'

  static examples = [
    '<%= config.bin %> auth login',
    '<%= config.bin %> auth login --api-key YOUR_KEY',
  ]

  static flags = {
    'api-key': Flags.string({
      description: 'API key (if not provided, you will be prompted)',
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
      this.warn('Warning: API key could not be validated.')
    }
  }
}
