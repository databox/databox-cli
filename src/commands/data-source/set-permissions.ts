import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DataSourceSetPermissions extends BaseCommand<typeof DataSourceSetPermissions> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'Set permissions for a data source'

  static examples = [
    '<%= config.bin %> data-source set-permissions 12345 --access-level everyone',
    '<%= config.bin %> data-source set-permissions 12345 --access-level selectedUsers --access-list 31 --access-list 42',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level',
      options: ['everyone', 'selectedUsers'],
      required: true,
    }),
    'access-list': Flags.integer({description: 'User ID granted access (repeat for several)', multiple: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetPermissions)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    // selectedUsers without an access list is rejected by the API, so catch it here
    // rather than after a round trip.
    if (this.flags['access-level'] === 'selectedUsers' && (this.flags['access-list'] ?? []).length === 0) {
      this.error('--access-list is required when --access-level is selectedUsers.', {exit: 2})
    }

    const response = await this.apiClient.put<Record<string, unknown>>(
      `/v2/data-sources/${args.dataSourceId}/permissions`,
      this.flags['access-list']
        ? {accessLevel: this.flags['access-level'], accessList: this.flags['access-list']}
        : {accessLevel: this.flags['access-level']},
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
