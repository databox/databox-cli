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
    '<%= config.bin %> data-source set-permissions 12345 --access-level specific_users',
  ]

  static flags = {
    'access-level': Flags.string({description: 'Access level (e.g. everyone, specific_users)', required: true}),
    'access-list': Flags.integer({description: 'User ID granted access (repeat for several)', multiple: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetPermissions)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

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
