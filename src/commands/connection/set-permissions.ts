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
    '<%= config.bin %> connection set-permissions 12345 --access-level selectedUsers --access-list 31',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level for the connection',
      options: ['everyone', 'selectedUsers', 'private'],
      required: true,
    }),
    'access-list': Flags.integer({description: 'User ID granted access (repeat for several)', multiple: true}),
    'shared-with-clients': Flags.boolean({default: false, description: 'Share this connection with client accounts'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConnectionSetPermissions)
    this.requireNumericId(args.connectionId, 'Connection ID')

    // selectedUsers without an access list is rejected by the API, so catch it here
    // rather than after a round trip.
    if (flags['access-level'] === 'selectedUsers' && (flags['access-list'] ?? []).length === 0) {
      this.error('--access-list is required when --access-level is selectedUsers.', {exit: 2})
    }

    const body: Record<string, unknown> = {
      accessLevel: flags['access-level'],
      sharedWithClients: flags['shared-with-clients'],
    }
    if (flags['access-list']) body.accessList = flags['access-list']

    const response = await this.apiClient.put<Record<string, unknown>>(`/v2/connections/${args.connectionId}/permissions`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
