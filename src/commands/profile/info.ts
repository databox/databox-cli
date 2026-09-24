import {BaseCommand} from '../../base-command.js'
import {printProfile} from '../../lib/profile.js'
import {ProfileResponse} from '../../lib/types.js'

export default class ProfileInfo extends BaseCommand<typeof ProfileInfo> {
  static description = 'Show your profile'

  static examples = [
    '<%= config.bin %> profile info',
    '<%= config.bin %> profile info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<ProfileResponse>('/v2/profile', undefined, this.accountHeaders)

    printProfile(response, this.outputFormat)
  }
}
