import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class UserInvite extends BaseCommand<typeof UserInvite> {
  static description = 'Invite a user to the account'

  static examples = [
    '<%= config.bin %> user invite --email user@example.com --role user',
    '<%= config.bin %> user invite --email admin@example.com --role admin --json',
  ]

  static flags = {
    email: Flags.string({description: 'Email address of the user to invite', required: true}),
    role: Flags.string({description: 'Role for the new user', options: ['admin', 'user'], required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UserInvite)

    const response = await this.apiClient.post('/v2/users', {
      email: flags.email,
      role: flags.role,
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
