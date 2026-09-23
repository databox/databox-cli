import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {AccountResponse} from '../../lib/types.js'

export default class AccountInfo extends BaseCommand<typeof AccountInfo> {
  static description = 'Show your account details'

  static examples = [
    '<%= config.bin %> account info',
    '<%= config.bin %> account info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<AccountResponse>('/v2/account', undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
