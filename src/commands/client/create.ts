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
    'website-url': Flags.string({description: 'Website URL for the client account'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ClientCreate)

    const body: Record<string, unknown> = {name: flags.name}
    if (flags['managed-by-id'] !== undefined) body.managedById = flags['managed-by-id']
    if (flags['website-url'] !== undefined) body.websiteUrl = flags['website-url']

    const response = await this.apiClient.post<Record<string, unknown>>('/v2/clients', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
