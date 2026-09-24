import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {AccountDetail} from '../../lib/types.js'

export default class AccountCreate extends BaseCommand<typeof AccountCreate> {
  static description = 'Create an account in your organization'

  static examples = [
    '<%= config.bin %> account create --name "Acme Inc"',
    '<%= config.bin %> account create --name "Acme Inc" --managed-by-id 12345',
    '<%= config.bin %> account create --name "Acme Inc" --json',
  ]

  static flags = {
    ...idempotencyFlags,
    'managed-by-id': Flags.integer({description: 'User ID of the account manager'}),
    name: Flags.string({description: 'Name of the account', required: true}),
    'website-url': Flags.string({description: 'Website URL for the account'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(AccountCreate)

    // The API rejects a blank name with a 400; catch it before the round trip.
    if (flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {name: flags.name}
    if (flags['managed-by-id'] !== undefined) body.managedById = flags['managed-by-id']
    if (flags['website-url'] !== undefined) body.websiteUrl = flags['website-url']

    const response = await this.apiClient.post<AccountDetail>('/v2/accounts', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    formatSingle(response, this.outputFormat)
  }
}
