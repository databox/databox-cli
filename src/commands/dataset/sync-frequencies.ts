import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface SyncFrequency {
  interval: number
  label: string
}

interface SyncFrequenciesResponse {
  items: SyncFrequency[]
}

export default class DatasetSyncFrequencies extends BaseCommand<typeof DatasetSyncFrequencies> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'List available sync frequencies for a dataset'

  static examples = [
    '<%= config.bin %> dataset sync-frequencies 12345',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncFrequencies)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<SyncFrequenciesResponse>(
      `/v2/datasets/${args.datasetId}/available-sync-frequencies`,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'Interval (min)', key: 'interval'},
        {header: 'Label', key: 'label'},
      ],
      this.flags.json,
    )
  }
}
