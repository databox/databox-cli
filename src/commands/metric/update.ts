import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class MetricUpdate extends BaseCommand<typeof MetricUpdate> {
  static args = {
    metricId: Args.string({description: 'The metric ID to update', required: true}),
  }

  static description = 'Update a metric'

  static examples = [
    '<%= config.bin %> metric update "500|custom_query_100" --name "New Name"',
    '<%= config.bin %> metric update "500|custom_query_100" --name "New Name" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New name for the metric'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricUpdate)

    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name).', {exit: 1})
    }

    const response = await this.apiClient.patch(`/v2/metrics/${encodeURIComponent(args.metricId)}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
