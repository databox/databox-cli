import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {AccountDetail} from '../../lib/types.js'

export default class AccountGet extends BaseCommand<typeof AccountGet> {
  static args = {
    accountId: Args.string({description: 'The account ID', required: true}),
  }

  static description = 'Get account details'

  static examples = [
    '<%= config.bin %> account get 12345',
    '<%= config.bin %> account get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(AccountGet)
    this.requireNumericId(args.accountId, 'Account ID')

    const response = await this.apiClient.get<AccountDetail>(`/v2/accounts/${args.accountId}`, undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
