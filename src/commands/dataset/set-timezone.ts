import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {DatasetDetail} from '../../lib/types.js'

export default class DatasetSetTimezone extends BaseCommand<typeof DatasetSetTimezone> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Set the timezone for a dataset

Prints a confirmation; --json or --output csv prints the updated dataset instead.`

  static examples = [
    '<%= config.bin %> dataset set-timezone 12345 --timezone "US/Eastern"',
    '<%= config.bin %> dataset set-timezone 12345 --timezone "Europe/London" --json',
  ]

  static flags = {
    'purge-data': Flags.boolean({default: false, description: 'Purge existing data when changing the timezone'}),
    timezone: Flags.string({description: 'Timezone to set', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetTimezone)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.put<DatasetDetail>(`/v2/datasets/${args.datasetId}/timezone`, {
      purgeData: flags['purge-data'],
      timezone: flags.timezone,
    }, this.accountHeaders)

    if (this.outputFormat === 'table') {
      const purged = flags['purge-data'] ? '; its existing data was purged' : ''
      this.log(`Timezone set to ${flags.timezone} for dataset ${args.datasetId}${purged}.`)
      return
    }

    formatSingle(response, this.outputFormat)
  }
}
