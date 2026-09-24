import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {Permissions} from '../../lib/types.js'

export default class DataSourceSetPermissions extends BaseCommand<typeof DataSourceSetPermissions> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = `Set permissions for a data source

everyone grants every user in the organization; selectedUsers grants only the users in --access-list; private grants no one explicitly. Admins and the organization owner always keep access.`

  static examples = [
    '<%= config.bin %> data-source set-permissions 12345 --access-level everyone',
    '<%= config.bin %> data-source set-permissions 12345 --access-level selectedUsers --access-list 31 --access-list 42',
    '<%= config.bin %> data-source set-permissions 12345 --access-level private',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level',
      options: ['everyone', 'selectedUsers', 'private'],
      required: true,
    }),
    'access-list': Flags.integer({description: 'User ID granted access, with --access-level selectedUsers (repeat for several)', multiple: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DataSourceSetPermissions)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    // The API rejects selectedUsers without a list, and ignores a list with any other level,
    // so both are caught here rather than after a round trip or a silent drop.
    const accessList = flags['access-list'] ?? []
    if (flags['access-level'] === 'selectedUsers' && accessList.length === 0) {
      this.error('--access-list is required when --access-level is selectedUsers.', {exit: 2})
    }

    if (flags['access-level'] !== 'selectedUsers' && accessList.length > 0) {
      this.error('--access-list is only accepted with --access-level selectedUsers.', {exit: 2})
    }

    const response = await this.apiClient.put<Permissions>(
      `/v2/data-sources/${args.dataSourceId}/permissions`,
      accessList.length > 0
        ? {accessLevel: flags['access-level'], accessList}
        : {accessLevel: flags['access-level']},
      this.accountHeaders,
    )

    formatSingle(response, this.outputFormat)
  }
}
