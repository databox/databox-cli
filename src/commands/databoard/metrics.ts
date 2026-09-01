import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DataboardMetrics extends BaseCommand<typeof DataboardMetrics> {
  static args = {
    databoardId: Args.string({description: 'The databoard ID', required: true}),
  }

  static description = 'Get metrics for a databoard'

  static examples = [
    '<%= config.bin %> databoard metrics 12345',
    '<%= config.bin %> databoard metrics 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataboardMetrics)

    const response = await this.apiClient.get(`/v2/databoards/${args.databoardId}/metrics`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
