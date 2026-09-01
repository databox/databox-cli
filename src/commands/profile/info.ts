import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface ProfileResponse {
  accountId: number
  accountType: string
  createdAt: string
  email: string
  id: number
  isEmailVerified: boolean
  name: string
  timezone: string | null
}

export default class ProfileInfo extends BaseCommand<typeof ProfileInfo> {
  static description = 'Show your profile'

  static examples = [
    '<%= config.bin %> profile info',
    '<%= config.bin %> profile info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<ProfileResponse>('/v2/profile')

    formatSingle(response, this.flags.json)
  }
}
