import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

/** AccountMetadataOptionsResponse.cs `MetadataOption`. */
interface MetadataOption {
  label: string
  value: string
}

/** AccountMetadataOptionsResponse.cs: the values organization update --metadata accepts. */
interface OrganizationMetadataOptionsResponse {
  annualRevenues: MetadataOption[]
  businessTypes: MetadataOption[]
  companySizes: MetadataOption[]
  industries: MetadataOption[]
}

export default class OrganizationMetadataOptions extends BaseCommand<typeof OrganizationMetadataOptions> {
  static description = 'List available metadata options for organization settings'

  static examples = [
    '<%= config.bin %> organization metadata-options',
    '<%= config.bin %> organization metadata-options --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<OrganizationMetadataOptionsResponse>('/v2/organization/metadata-options', undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
