import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ProfileMetadataOptions extends BaseCommand<typeof ProfileMetadataOptions> {
  static description = 'List available departments and roles for profile metadata'

  static examples = [
    '<%= config.bin %> profile metadata-options',
    '<%= config.bin %> profile metadata-options --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<Record<string, unknown>>('/v2/profile/metadata-options', undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
