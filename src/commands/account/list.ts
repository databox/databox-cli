import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Account {
  accountType: string
  id: number
  name: string
}

interface AccountListResponse {
  accounts: Account[]
}

export default class AccountList extends BaseCommand<typeof AccountList> {
  static description = 'List all accounts you have access to'

  static examples = [
    '<%= config.bin %> account list',
    '<%= config.bin %> account list --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<AccountListResponse>('/v1/accounts')

    formatOutput(
      response.accounts,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Account Type', key: 'accountType'},
      ],
      this.flags.json,
    )
  }
}
