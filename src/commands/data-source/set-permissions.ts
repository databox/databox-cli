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
  ]

  static flags = {
    'access-level': Flags.string({description: 'Access level (e.g. everyone, specific_users)', required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetPermissions)

    const response = await this.apiClient.put<Record<string, unknown>>(
      `/v2/data-sources/${args.dataSourceId}/permissions`,
      {accessLevel: this.flags['access-level']},
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
