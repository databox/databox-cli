import {
  Command, Errors, Flags, Interfaces,
} from '@oclif/core'

import {
  ApiClient, ApiConnectionError, ApiRequestError, describeApiError,
} from './lib/api-client.js'
import {loadConfig} from './lib/config.js'
import {OUTPUT_FORMATS, OutputFormat, colorEnabled} from './lib/output.js'

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof BaseCommand['baseFlags']>

export abstract class BaseCommand<T extends typeof Command = typeof Command> extends Command {
  static baseFlags = {
    'account-id': Flags.string({
      description: 'Target an account in your organization',
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
      description: 'Output as JSON (shorthand for --output json)',
    }),
    'no-color': Flags.boolean({
      default: false,
      description: 'Disable coloured output (a non-empty NO_COLOR environment variable does the same)',
    }),
    output: Flags.option({
      default: 'table' as const,
      description: 'Output format',
      exclusive: ['json'],
      options: OUTPUT_FORMATS,
    })(),
    verbose: Flags.boolean({
      default: false,
      description: 'Print each request and response (method, URL, status, duration, request ID) to stderr',
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
        trace: this.flags.verbose ? line => this.logToStderr(line) : undefined,
      })
    }

    return this._apiClient
  }

  /**
   * Whether the CLI's own output may use colour. That output has none today, so this is the
   * switch any colour added later must check. oclif colours its error marker separately; see
   * colorEnabled().
   */
  protected get color(): boolean {
    return colorEnabled(this.flags['no-color'])
  }

  /** --json is shorthand for --output json; the two are mutually exclusive. */
  protected get outputFormat(): OutputFormat {
    return this.flags.json ? 'json' : this.flags.output
  }

  /**
   * Renders API failures with their code, field and request ID (exit 1), and failures to reach
   * the API at all (exit 2), before oclif's own handler prints them.
   */
  protected async catch(error: Interfaces.CommandError): Promise<unknown> {
    if (error instanceof ApiRequestError) {
      return super.catch(new Errors.CLIError(describeApiError(error), {exit: 1}))
    }

    if (error instanceof ApiConnectionError) {
      return super.catch(new Errors.CLIError(error.message, {exit: 2}))
    }

    return super.catch(error)
  }

  public async init(): Promise<void> {
    await super.init()
    const {flags} = await this.parse(this.constructor as typeof BaseCommand)
    this.flags = flags as Flags<T>

    // Checked here, before run(), so a bad key fails before any prompt or request. The API
    // would reject it too, but only after a destructive command had asked for confirmation.
    const idempotencyKey = (flags as {'idempotency-key'?: string})['idempotency-key']
    if (idempotencyKey !== undefined) this.requireUuid(idempotencyKey, '--idempotency-key')
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
