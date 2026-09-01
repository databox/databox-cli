import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class UserDelete extends BaseCommand<typeof UserDelete> {
  static args = {
    userId: Args.string({description: 'The user ID to remove', required: true}),
  }

  static description = 'Remove a user from the account'

  static examples = [
    '<%= config.bin %> user delete 12345',
    '<%= config.bin %> user delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({default: false, description: 'Skip confirmation prompt'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(UserDelete)

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to remove user ${args.userId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/users/${args.userId}`, this.accountHeaders)

    this.log(`User ${args.userId} removed.`)
  }
}
