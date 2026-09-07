import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface UsageBucket {
  count: number
  limit: number | null
}

interface AccountUsageResponse {
  clients: UsageBucket
  dataSources: UsageBucket
  users: UsageBucket
}

export default class AccountUsage extends BaseCommand<typeof AccountUsage> {
  static description = 'Show account usage statistics'

  static examples = [
    '<%= config.bin %> account usage',
    '<%= config.bin %> account usage --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<AccountUsageResponse>('/v2/account/usage', undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
