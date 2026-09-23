import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {UserDetail} from '../../lib/types.js'

export default class UserUpdate extends BaseCommand<typeof UserUpdate> {
  static args = {
    userId: Args.string({description: 'The user ID to update', required: true}),
  }

  static description = "Update a user's name or role"

  static examples = [
    '<%= config.bin %> user update 12345 --role admin',
    '<%= config.bin %> user update 12345 --role viewer --json',
    '<%= config.bin %> user update 12345 --name "Jane Doe"',
  ]

  static flags = {
    name: Flags.string({description: 'New display name for the user'}),
    role: Flags.string({description: 'New role for the user', options: ['admin', 'user', 'editor', 'viewer']}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(UserUpdate)
    this.requireNumericId(args.userId, 'User ID')

    // The API rejects a blank name with a 400; catch it before the round trip.
    if (flags.name !== undefined && flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {}
    if (flags.name !== undefined) body.name = flags.name
    if (flags.role !== undefined) body.role = flags.role

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name or --role).', {exit: 1})
    }

    const response = await this.apiClient.patch<UserDetail>(`/v2/users/${args.userId}`, body, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
