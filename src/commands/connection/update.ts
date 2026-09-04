import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ConnectionUpdate extends BaseCommand<typeof ConnectionUpdate> {
  static args = {
    connectionId: Args.string({description: 'The connection ID to update', required: true}),
  }

  static description = 'Update a connection'

  static examples = [
    '<%= config.bin %> connection update 12345 --name "New Name"',
    '<%= config.bin %> connection update 12345 --name "New Name" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New name for the connection'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConnectionUpdate)
    this.requireNumericId(args.connectionId, 'Connection ID')

    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name).', {exit: 1})
    }

    const response = await this.apiClient.patch(`/v2/connections/${args.connectionId}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
