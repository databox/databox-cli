import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DataSourceGet extends BaseCommand<typeof DataSourceGet> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'Get details of a data source'

  static examples = [
    '<%= config.bin %> data-source get 12345',
    '<%= config.bin %> data-source get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceGet)

    const response = await this.apiClient.get<Record<string, unknown>>(`/v2/data-sources/${args.dataSourceId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
