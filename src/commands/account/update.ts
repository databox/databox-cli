import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {AccountDetail} from '../../lib/types.js'

export default class AccountUpdate extends BaseCommand<typeof AccountUpdate> {
  static args = {
    accountId: Args.string({description: 'The account ID to update', required: true}),
  }

  static description = 'Update an account'

  static examples = [
    '<%= config.bin %> account update 12345 --name "New Name"',
    '<%= config.bin %> account update 12345 --managed-by-id 67890',
    '<%= config.bin %> account update 12345 --name "New Name" --json',
  ]

  static flags = {
    'managed-by-id': Flags.integer({description: 'User ID of the account manager'}),
    name: Flags.string({description: 'New name for the account'}),
    'website-url': Flags.string({description: 'New website URL'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(AccountUpdate)
    this.requireNumericId(args.accountId, 'Account ID')

    // The API rejects a blank name with a 400; catch it before the round trip.
    if (this.flags.name !== undefined && this.flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {}
    if (this.flags.name !== undefined) body.name = this.flags.name
    if (this.flags['managed-by-id'] !== undefined) body.managedById = this.flags['managed-by-id']
    if (this.flags['website-url'] !== undefined) body.websiteUrl = this.flags['website-url']

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name, --managed-by-id, --website-url).', {exit: 1})
    }

    const response = await this.apiClient.patch<AccountDetail>(`/v2/accounts/${args.accountId}`, body, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
