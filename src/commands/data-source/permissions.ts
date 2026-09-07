import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DataSourcePermissions extends BaseCommand<typeof DataSourcePermissions> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'Show permissions for a data source'

  static examples = [
    '<%= config.bin %> data-source permissions 12345',
    '<%= config.bin %> data-source permissions 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourcePermissions)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const response = await this.apiClient.get<Record<string, unknown>>(
      `/v2/data-sources/${args.dataSourceId}/permissions`,
      undefined,
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
