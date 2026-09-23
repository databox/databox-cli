import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

/** ProfileMetadataOptionsResponse.cs `RoleOption`. */
interface RoleOption {
  label: string
  value: string
}

/** ProfileMetadataOptionsResponse.cs `DepartmentOption`: a department and the roles within it. */
interface DepartmentOption {
  label: string
  roles: RoleOption[]
  value: string
}

/** ProfileMetadataOptionsResponse.cs: the values profile update --metadata accepts. */
interface ProfileMetadataOptionsResponse {
  departments: DepartmentOption[]
}

export default class ProfileMetadataOptions extends BaseCommand<typeof ProfileMetadataOptions> {
  static description = 'List available departments and roles for profile metadata'

  static examples = [
    '<%= config.bin %> profile metadata-options',
    '<%= config.bin %> profile metadata-options --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<ProfileMetadataOptionsResponse>('/v2/profile/metadata-options', undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
