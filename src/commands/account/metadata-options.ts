import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

/** AccountMetadataOptionsResponse.cs `MetadataOption`. */
interface MetadataOption {
  label: string
  value: string
}

/** AccountMetadataOptionsResponse.cs: the values account update --metadata accepts. */
interface AccountMetadataOptionsResponse {
  annualRevenues: MetadataOption[]
  businessTypes: MetadataOption[]
  companySizes: MetadataOption[]
  industries: MetadataOption[]
}

export default class AccountMetadataOptions extends BaseCommand<typeof AccountMetadataOptions> {
  static description = 'List available metadata options for account settings'

  static examples = [
    '<%= config.bin %> account metadata-options',
    '<%= config.bin %> account metadata-options --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<AccountMetadataOptionsResponse>('/v2/account/metadata-options', undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
