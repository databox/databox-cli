import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'
import {SyncFrequencyOption} from '../../lib/types.js'

export default class DatasetSyncFrequencyOptions extends BaseCommand<typeof DatasetSyncFrequencyOptions> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'List the sync frequencies a dataset can be set to, and which your plan includes'

  static examples = [
    '<%= config.bin %> dataset sync-frequency-options 12345',
    '<%= config.bin %> dataset sync-frequency-options 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSyncFrequencyOptions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<{items: SyncFrequencyOption[]}>(
      `/v2/datasets/${args.datasetId}/sync-frequency-options`,
      undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {get: row => String(row.syncInterval), header: 'Interval (min)'},
        {header: 'Label', key: 'label'},
        {get: row => (row.isDefault ? 'yes' : ''), header: 'Default'},
        {get: row => (row.isSelected ? 'yes' : ''), header: 'Selected'},
        {header: 'Availability', key: 'availability'},
      ],
      this.outputFormat,
    )
  }
}
