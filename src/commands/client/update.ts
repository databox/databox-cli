import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ClientUpdate extends BaseCommand<typeof ClientUpdate> {
  static args = {
    clientId: Args.string({description: 'The client account ID to update', required: true}),
  }

  static description = 'Update a client account'

  static examples = [
    '<%= config.bin %> client update 12345 --name "New Name"',
    '<%= config.bin %> client update 12345 --managed-by-id 67890',
    '<%= config.bin %> client update 12345 --name "New Name" --json',
  ]

  static flags = {
    'managed-by-id': Flags.integer({description: 'User ID of the account manager'}),
    name: Flags.string({description: 'New name for the client account'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(ClientUpdate)
    this.requireNumericId(args.clientId, 'Client ID')

    const body: Record<string, unknown> = {}
    if (this.flags.name) body.name = this.flags.name
    if (this.flags['managed-by-id']) body.managedById = this.flags['managed-by-id']

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name, --managed-by-id).', {exit: 1})
    }

    const response = await this.apiClient.patch(`/v2/clients/${args.clientId}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
