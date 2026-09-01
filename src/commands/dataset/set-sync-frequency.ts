import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DatasetSetSyncFrequency extends BaseCommand<typeof DatasetSetSyncFrequency> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Set the sync frequency for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-sync-frequency 12345 --interval 60',
  ]

  static flags = {
    interval: Flags.integer({description: 'Sync interval in minutes', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetSyncFrequency)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    await this.apiClient.put(`/v2/datasets/${args.datasetId}/sync-frequency`, {interval: flags.interval})

    this.log(`Sync frequency set to ${flags.interval} minutes for dataset ${args.datasetId}.`)
  }
}
