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
    name: Flags.string({description: 'New display name for the user'}),
    role: Flags.string({description: 'New role for the user', options: ['admin', 'user']}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(UserUpdate)
    this.requireNumericId(args.userId, 'User ID')

    const body: Record<string, unknown> = {}
    if (flags.name !== undefined) body.name = flags.name
    if (flags.role !== undefined) body.role = flags.role

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name or --role).', {exit: 1})
    }

    const response = await this.apiClient.patch(`/v2/users/${args.userId}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
