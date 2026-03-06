import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class DataSourceDelete extends BaseCommand<typeof DataSourceDelete> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source to delete',
      required: true,
    }),
  }

  static description = 'Delete a data source'

  static examples = [
    '<%= config.bin %> data-source delete 12345',
    '<%= config.bin %> data-source delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DataSourceDelete)

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete data source ${args.dataSourceId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v1/data-sources/${args.dataSourceId}`)

    this.log(`Data source ${args.dataSourceId} deleted.`)
  }
}
