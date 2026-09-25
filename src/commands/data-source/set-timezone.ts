import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {DataSourceDetail} from '../../lib/types.js'

export default class DataSourceSetTimezone extends BaseCommand<typeof DataSourceSetTimezone> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = `Set the timezone for a data source

Prints a confirmation; --json or --output csv prints the updated data source instead.`

  static examples = [
    '<%= config.bin %> data-source set-timezone 12345 --timezone "US/Eastern"',
    '<%= config.bin %> data-source set-timezone 12345 --timezone "Europe/London" --apply-to-datasets --json',
  ]

  static flags = {
    'apply-to-datasets': Flags.boolean({default: false, description: 'Apply the timezone to the datasets too'}),
    'purge-data': Flags.boolean({default: false, description: 'Purge existing data when changing the timezone'}),
    timezone: Flags.string({description: 'Timezone value', required: true}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceSetTimezone)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const response = await this.apiClient.put<DataSourceDetail>(`/v2/data-sources/${args.dataSourceId}/timezone`, {
      applyToDatasets: this.flags['apply-to-datasets'],
      purgeData: this.flags['purge-data'],
      timezone: this.flags.timezone,
    }, this.accountHeaders)

    if (this.outputFormat === 'table') {
      const purged = this.flags['purge-data'] ? '; its existing data was purged' : ''
      this.log(`Timezone set to "${this.flags.timezone}" for data source ${args.dataSourceId}${purged}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
