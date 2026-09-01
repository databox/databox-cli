import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class UserUpdate extends BaseCommand<typeof UserUpdate> {
  static args = {
    userId: Args.string({description: 'The user ID to update', required: true}),
  }

  static description = "Update a user's role"

  static examples = [
    '<%= config.bin %> user update 12345 --role admin',
    '<%= config.bin %> user update 12345 --role user --json',
  ]

  static flags = {
    role: Flags.string({description: 'New role for the user', options: ['admin', 'user'], required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(UserUpdate)

    const response = await this.apiClient.patch(`/v2/users/${args.userId}`, {
      role: flags.role,
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
