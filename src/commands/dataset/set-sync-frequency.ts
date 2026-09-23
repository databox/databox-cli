import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {SYNC_INTERVALS} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {DatasetDetail} from '../../lib/types.js'

export default class DatasetSetSyncFrequency extends BaseCommand<typeof DatasetSetSyncFrequency> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Set the sync frequency for a dataset

Prints a confirmation; --json or --output csv prints the updated dataset instead. Run "dataset sync-frequency-options" to see which intervals your plan includes.`

  static examples = [
    '<%= config.bin %> dataset set-sync-frequency 12345 --interval 60',
    '<%= config.bin %> dataset set-sync-frequency 12345 --interval 1440 --json',
  ]

  static flags = {
    interval: Flags.integer({description: 'Sync interval in minutes', options: SYNC_INTERVALS, required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetSyncFrequency)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.put<DatasetDetail>(`/v2/datasets/${args.datasetId}/sync-frequency`, {syncInterval: flags.interval}, this.accountHeaders)

    if (this.outputFormat === 'table') {
      this.log(`Sync frequency set to ${flags.interval} minutes for dataset ${args.datasetId}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
