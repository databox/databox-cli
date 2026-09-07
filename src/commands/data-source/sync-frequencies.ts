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

export default class DataSourceSyncFrequencies extends BaseCommand<typeof DataSourceSyncFrequencies> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'List available sync frequencies for a data source'

  static examples = [
    '<%= config.bin %> data-source sync-frequencies 12345',
    '<%= config.bin %> data-source sync-frequencies 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSyncFrequencies)

    this.requireNumericId(args.dataSourceId, 'Data source ID')

    // This endpoint returns a bare array, not the usual {items} envelope.
    const response = await this.apiClient.get<SyncFrequency[]>(
      `/v2/data-sources/${args.dataSourceId}/available-sync-frequencies`,
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
