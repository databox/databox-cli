import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class DataSourcePurge extends BaseCommand<typeof DataSourcePurge> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source to purge',
      required: true,
    }),
  }

  static description = 'Purge all data from a data source'

  static examples = [
    '<%= config.bin %> data-source purge 12345',
    '<%= config.bin %> data-source purge 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DataSourcePurge)

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to purge all data from data source ${args.dataSourceId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.post(`/v2/data-sources/${args.dataSourceId}/purge`, undefined, this.accountHeaders)

    this.log(`Data source ${args.dataSourceId} purged.`)
  }
}
