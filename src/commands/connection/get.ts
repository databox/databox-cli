import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ConnectionGet extends BaseCommand<typeof ConnectionGet> {
  static args = {
    connectionId: Args.string({description: 'The connection ID', required: true}),
  }

  static description = 'Get connection details'

  static examples = [
    '<%= config.bin %> connection get 12345',
    '<%= config.bin %> connection get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ConnectionGet)

    const response = await this.apiClient.get(`/v2/connections/${args.connectionId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
