import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {ConnectionPermissions} from '../../lib/types.js'

export default class ConnectionSetPermissions extends BaseCommand<typeof ConnectionSetPermissions> {
  static args = {
    connectionId: Args.string({description: 'The connection ID', required: true}),
  }

  static description = `Update connection permissions

--shared-with-accounts or --no-shared-with-accounts is required: the API replaces the sharing setting on every call, so leaving it out would silently un-share the connection.`

  static examples = [
    '<%= config.bin %> connection set-permissions 12345 --access-level everyone --shared-with-accounts',
    '<%= config.bin %> connection set-permissions 12345 --access-level private --no-shared-with-accounts --json',
    '<%= config.bin %> connection set-permissions 12345 --access-level selectedUsers --access-list 31 --no-shared-with-accounts',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level for the connection',
      options: ['everyone', 'selectedUsers', 'private'],
      required: true,
    }),
    'access-list': Flags.integer({description: 'User ID granted access, with --access-level selectedUsers (repeat for several)', multiple: true}),
    // Required, with no default: the API field is a required bool, and a default would pick a side for the user.
    'shared-with-accounts': Flags.boolean({
      allowNo: true,
      description: 'Share this connection with the accounts in your organization (--no-shared-with-accounts to stop sharing)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConnectionSetPermissions)
    this.requireNumericId(args.connectionId, 'Connection ID')

    // The API rejects selectedUsers without a list, and ignores a list with any other level,
    // so both are caught here rather than after a round trip or a silent drop.
    const accessList = flags['access-list'] ?? []
    if (flags['access-level'] === 'selectedUsers' && accessList.length === 0) {
      this.error('--access-list is required when --access-level is selectedUsers.', {exit: 2})
    }

    if (flags['access-level'] !== 'selectedUsers' && accessList.length > 0) {
      this.error('--access-list is only accepted with --access-level selectedUsers.', {exit: 2})
    }

    const body: Record<string, unknown> = {
      accessLevel: flags['access-level'],
      sharedWithAccounts: flags['shared-with-accounts'],
    }
    if (accessList.length > 0) body.accessList = accessList

    const response = await this.apiClient.put<ConnectionPermissions>(`/v2/connections/${args.connectionId}/permissions`, body, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
