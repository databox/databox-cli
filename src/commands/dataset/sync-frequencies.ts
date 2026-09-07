import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface SyncFrequency {
  availability: string
  isDefault: boolean
  isSelected: boolean
  label: string
  syncInterval: number
}

export default class DatasetSyncFrequencies extends BaseCommand<typeof DatasetSyncFrequencies> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'List available sync frequencies for a dataset'

  static examples = [
    '<%= config.bin %> dataset sync-frequencies 12345',
    '<%= config.bin %> dataset sync-frequencies 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncFrequencies)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    // This endpoint returns a bare array, not the usual {items} envelope.
    const response = await this.apiClient.get<SyncFrequency[]>(
      `/v2/datasets/${args.datasetId}/available-sync-frequencies`,
      undefined,
      this.accountHeaders,
    )

    formatOutput(
      response,
      [
        {get: (row) => String(row.syncInterval), header: 'Interval (min)'},
        {header: 'Label', key: 'label'},
        {get: (row) => (row.isSelected ? 'yes' : ''), header: 'Selected'},
        {header: 'Availability', key: 'availability'},
      ],
      this.flags.json,
    )
  }
}
