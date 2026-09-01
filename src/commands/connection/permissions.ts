import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ConnectionPermissions extends BaseCommand<typeof ConnectionPermissions> {
  static args = {
    connectionId: Args.string({description: 'The connection ID', required: true}),
  }

  static description = 'Show connection permissions'

  static examples = [
    '<%= config.bin %> connection permissions 12345',
    '<%= config.bin %> connection permissions 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConnectionPermissions)

    const response = await this.apiClient.get(`/v2/connections/${args.connectionId}/permissions`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
