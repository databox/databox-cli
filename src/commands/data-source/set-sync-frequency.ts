import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {SYNC_INTERVALS} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {DataSourceDetail} from '../../lib/types.js'

export default class DataSourceSetSyncFrequency extends BaseCommand<typeof DataSourceSetSyncFrequency> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = `Set the sync frequency for a data source

Prints a confirmation; --json or --output csv prints the updated data source instead. Run "data-source sync-frequency-options" to see which intervals your plan includes.`

  static examples = [
    '<%= config.bin %> data-source set-sync-frequency 12345 --interval 60',
    '<%= config.bin %> data-source set-sync-frequency 12345 --interval 1440 --json',
  ]

  static flags = {
    interval: Flags.integer({description: 'Sync interval in minutes', options: SYNC_INTERVALS, required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetSyncFrequency)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const response = await this.apiClient.put<DataSourceDetail>(
      `/v2/data-sources/${args.dataSourceId}/sync-frequency`,
      {syncInterval: this.flags.interval},
      this.accountHeaders,
    )

    if (this.outputFormat === 'table') {
      this.log(`Sync frequency set to ${this.flags.interval} minutes for data source ${args.dataSourceId}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
