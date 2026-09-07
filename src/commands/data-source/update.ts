import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DataSourceUpdate extends BaseCommand<typeof DataSourceUpdate> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source to update',
      required: true,
    }),
  }

  static description = 'Update a data source'

  static examples = [
    '<%= config.bin %> data-source update 12345 --name "New Name"',
    '<%= config.bin %> data-source update 12345 --name "New Name" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New name for the data source', required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceUpdate)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const body: Record<string, unknown> = {name: this.flags.name}

    const response = await this.apiClient.patch<Record<string, unknown>>(`/v2/data-sources/${args.dataSourceId}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
