import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'

export default class DatasetSetTimezone extends BaseCommand<typeof DatasetSetTimezone> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Set the timezone for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-timezone 12345 --timezone "US/Eastern"',
  ]

  static flags = {
    timezone: Flags.string({description: 'Timezone to set', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetTimezone)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    await this.apiClient.put(`/v2/datasets/${args.datasetId}/timezone`, {timezone: flags.timezone})

    this.log(`Timezone set to ${flags.timezone} for dataset ${args.datasetId}.`)
  }
}
