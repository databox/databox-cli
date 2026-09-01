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

    const response = await this.apiClient.get<SyncFrequenciesResponse>(
      `/v2/data-sources/${args.dataSourceId}/available-sync-frequencies`,
      undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'Interval (min)', get: (row) => String(row.interval)},
        {header: 'Label', key: 'label'},
      ],
      this.flags.json,
    )
  }
}
