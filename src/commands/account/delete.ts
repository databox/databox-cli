import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class AccountDelete extends BaseCommand<typeof AccountDelete> {
  static args = {
    accountId: Args.string({description: 'The account ID to delete', required: true}),
  }

  static description = 'Delete an account from your organization'

  static examples = [
    '<%= config.bin %> account delete 12345',
    '<%= config.bin %> account delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({default: false, description: 'Skip confirmation prompt'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(AccountDelete)
    this.requireNumericId(args.accountId, 'Account ID')

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete account ${args.accountId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/accounts/${args.accountId}`, this.accountHeaders)

    this.log(`Account ${args.accountId} deleted.`)
  }
}
