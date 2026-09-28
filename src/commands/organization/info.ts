import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {OrganizationResponse} from '../../lib/types.js'

export default class OrganizationInfo extends BaseCommand<typeof OrganizationInfo> {
  static description = 'Show your organization details'

  static examples = [
    '<%= config.bin %> organization info',
    '<%= config.bin %> organization info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<OrganizationResponse>('/v2/organization', undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
