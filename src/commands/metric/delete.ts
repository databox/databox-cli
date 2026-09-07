import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class MetricDelete extends BaseCommand<typeof MetricDelete> {
  static args = {
    metricId: Args.string({description: 'The metric ID to delete', required: true}),
  }

  static description = 'Delete a metric'

  static examples = [
    '<%= config.bin %> metric delete "500|custom_query_100"',
    '<%= config.bin %> metric delete "500|custom_query_100" --force',
  ]

  static flags = {
    force: Flags.boolean({default: false, description: 'Skip confirmation prompt'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MetricDelete)

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete metric ${args.metricId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/metrics/${encodeURIComponent(args.metricId)}`, this.accountHeaders)

    this.log(`Metric ${args.metricId} deleted.`)
  }
}
