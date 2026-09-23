import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {ClientDetail} from '../../lib/types.js'

export default class ClientCreate extends BaseCommand<typeof ClientCreate> {
  static description = 'Create a client account'

  static examples = [
    '<%= config.bin %> client create --name "Client Company"',
    '<%= config.bin %> client create --name "Client Company" --managed-by-id 12345',
    '<%= config.bin %> client create --name "Client Company" --json',
  ]

  static flags = {
    ...idempotencyFlags,
    'managed-by-id': Flags.integer({description: 'User ID of the account manager'}),
    name: Flags.string({description: 'Name of the client account', required: true}),
    'website-url': Flags.string({description: 'Website URL for the client account'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ClientCreate)

    // The API rejects a blank name with a 400; catch it before the round trip.
    if (flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {name: flags.name}
    if (flags['managed-by-id'] !== undefined) body.managedById = flags['managed-by-id']
    if (flags['website-url'] !== undefined) body.websiteUrl = flags['website-url']

    const response = await this.apiClient.post<ClientDetail>('/v2/clients', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    formatSingle(response, this.outputFormat)
  }
}
