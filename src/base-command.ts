import {Command, Flags, Interfaces} from '@oclif/core'

import {ApiClient} from './lib/api-client.js'
import {loadConfig} from './lib/config.js'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['baseFlags'] & T['flags']>

export abstract class BaseCommand<T extends typeof Command = typeof Command> extends Command {
  static baseFlags = {
    'account-id': Flags.string({
      description: 'Target account ID (for multi-account access)',
      env: 'DATABOX_ACCOUNT_ID',
      hidden: true,
    }),
    'api-key': Flags.string({
      description: 'Override the API key',
      env: 'DATABOX_API_KEY',
      hidden: true,
    }),
    'api-url': Flags.string({
      description: 'Override the API base URL',
      env: 'DATABOX_API_URL',
      hidden: true,
    }),
    json: Flags.boolean({
      description: 'Output as JSON',
      default: false,
    }),
  }

  protected flags!: Flags<T>
  private _apiClient?: ApiClient

  protected get apiClient(): ApiClient {
    if (!this._apiClient) {
      const config = loadConfig()
      const apiKey = this.flags['api-key'] ?? config.apiKey
      if (!apiKey) {
        this.error('Not authenticated. Run "databox auth login" first.', {exit: 1})
      }

      this._apiClient = new ApiClient({
        apiKey,
        baseUrl: this.flags['api-url'] ?? config.apiUrl,
      })
    }

    return this._apiClient
  }

  protected get accountHeaders(): Record<string, string> {
    const accountId = this.flags['account-id']
    return accountId ? {'x-account-id': accountId} : {}
  }

  public async init(): Promise<void> {
    await super.init()
    const {flags} = await this.parse(this.constructor as typeof BaseCommand)
    this.flags = flags as Flags<T>
  }
}
