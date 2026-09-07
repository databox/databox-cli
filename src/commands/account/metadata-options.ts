import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class AccountMetadataOptions extends BaseCommand<typeof AccountMetadataOptions> {
  static description = 'List available metadata options for account settings'

  static examples = [
    '<%= config.bin %> account metadata-options',
    '<%= config.bin %> account metadata-options --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<Record<string, unknown>>('/v2/account/metadata-options', undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
