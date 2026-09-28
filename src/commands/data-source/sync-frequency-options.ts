import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'
import {SyncFrequencyOption} from '../../lib/types.js'

export default class DataSourceSyncFrequencyOptions extends BaseCommand<typeof DataSourceSyncFrequencyOptions> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'List the sync frequencies a data source can be set to, and which your plan includes'

  static examples = [
    '<%= config.bin %> data-source sync-frequency-options 12345',
    '<%= config.bin %> data-source sync-frequency-options 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSyncFrequencyOptions)

    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const response = await this.apiClient.get<{items: SyncFrequencyOption[]}>(
      `/v2/data-sources/${args.dataSourceId}/sync-frequency-options`,
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
