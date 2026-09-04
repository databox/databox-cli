import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ClientCreate extends BaseCommand<typeof ClientCreate> {
  static description = 'Create a client account'

  static examples = [
    '<%= config.bin %> client create --name "Client Company"',
    '<%= config.bin %> client create --name "Client Company" --managed-by-id 12345',
    '<%= config.bin %> client create --name "Client Company" --json',
  ]

  static flags = {
    'managed-by-id': Flags.integer({description: 'User ID of the account manager'}),
    name: Flags.string({description: 'Name of the client account', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ClientCreate)

    const body: Record<string, unknown> = {name: flags.name}
    if (flags['managed-by-id']) body.managedById = flags['managed-by-id']

    const response = await this.apiClient.post('/v2/clients', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
