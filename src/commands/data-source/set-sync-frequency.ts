import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DataSourceSetSyncFrequency extends BaseCommand<typeof DataSourceSetSyncFrequency> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'Set the sync frequency for a data source'

  static examples = [
    '<%= config.bin %> data-source set-sync-frequency 12345 --interval 60',
    '<%= config.bin %> data-source set-sync-frequency 12345 --interval 1440',
  ]

  static flags = {
    interval: Flags.integer({description: 'Sync interval in minutes', required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetSyncFrequency)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    await this.apiClient.put(`/v2/data-sources/${args.dataSourceId}/sync-frequency`, {interval: this.flags.interval}, this.accountHeaders)

    this.log(`Sync frequency set to ${this.flags.interval} minutes for data source ${args.dataSourceId}.`)
  }
}
