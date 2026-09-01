import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DataSourceSetTimezone extends BaseCommand<typeof DataSourceSetTimezone> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'Set the timezone for a data source'

  static examples = [
    '<%= config.bin %> data-source set-timezone 12345 --timezone "US/Eastern"',
  ]

  static flags = {
    timezone: Flags.string({description: 'Timezone value', required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetTimezone)

    await this.apiClient.put(`/v2/data-sources/${args.dataSourceId}/timezone`, {timezone: this.flags.timezone}, this.accountHeaders)

    this.log(`Timezone set to "${this.flags.timezone}" for data source ${args.dataSourceId}.`)
  }
}
