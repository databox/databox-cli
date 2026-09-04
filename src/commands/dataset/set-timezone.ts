import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DatasetSetTimezone extends BaseCommand<typeof DatasetSetTimezone> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Set the timezone for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-timezone 12345 --timezone "US/Eastern"',
    '<%= config.bin %> dataset set-timezone 12345 --timezone "Europe/London"',
  ]

  static flags = {
    timezone: Flags.string({description: 'Timezone to set', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetTimezone)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    await this.apiClient.put(`/v2/datasets/${args.datasetId}/timezone`, {timezone: flags.timezone}, this.accountHeaders)

    this.log(`Timezone set to ${flags.timezone} for dataset ${args.datasetId}.`)
  }
}
