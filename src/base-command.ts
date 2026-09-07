import {Command, Flags, Interfaces} from '@oclif/core'

import {ApiClient} from './lib/api-client.js'
import {loadConfig} from './lib/config.js'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof BaseCommand['baseFlags']>

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
      default: false,
      description: 'Output as JSON',
    }),
  }

  protected flags!: Flags<T>
  private _apiClient?: ApiClient

  protected get accountHeaders(): Record<string, string> {
    const accountId = this.flags['account-id']
    if (!accountId) return {}

    if (!/^\d+$/.test(accountId)) {
      this.error('--account-id must be a numeric value.', {exit: 2})
    }

    return {'x-account-id': accountId}
  }

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

  public async init(): Promise<void> {
    await super.init()
    const {flags} = await this.parse(this.constructor as typeof BaseCommand)
    this.flags = flags as Flags<T>
  }

  /**
   * Parses a JSON-valued flag, failing with an actionable message instead of a raw
   * SyntaxError. `shape` is shown to the user, so make it a concrete example.
   */
  protected parseJsonFlag<T>(value: string, flag: string, shape: string): T {
    try {
      return JSON.parse(value) as T
    } catch {
      this.error(`Invalid JSON for --${flag}. Expected format: ${shape}`, {exit: 2})
    }
  }

  protected requireNumericId(value: string, name: string): void {
    if (!/^\d+$/.test(value)) {
      this.error(`${name} must be a numeric value.`, {exit: 2})
    }
  }

  /** For route segments the API constrains to a GUID, e.g. /ingestions/{id:guid}. */
  protected requireUuid(value: string, name: string): void {
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) {
      this.error(`${name} must be a UUID.`, {exit: 2})
    }
  }
}
