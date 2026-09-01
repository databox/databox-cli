import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ConnectionSetPermissions extends BaseCommand<typeof ConnectionSetPermissions> {
  static args = {
    connectionId: Args.string({description: 'The connection ID', required: true}),
  }

  static description = 'Update connection permissions'

  static examples = [
    '<%= config.bin %> connection set-permissions 12345 --access-level everyone',
    '<%= config.bin %> connection set-permissions 12345 --access-level private --json',
  ]

  static flags = {
    'access-level': Flags.string({description: 'Access level for the connection', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConnectionSetPermissions)

    const response = await this.apiClient.put(`/v2/connections/${args.connectionId}/permissions`, {
      accessLevel: flags['access-level'],
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
