import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class UserGet extends BaseCommand<typeof UserGet> {
  static args = {
    userId: Args.string({description: 'The user ID', required: true}),
  }

  static description = 'Get user details'

  static examples = [
    '<%= config.bin %> user get 12345',
    '<%= config.bin %> user get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(UserGet)
    this.requireNumericId(args.userId, 'User ID')

    const response = await this.apiClient.get(`/v2/users/${args.userId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
