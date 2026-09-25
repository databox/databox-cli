import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class DatasetDelete extends BaseCommand<typeof DatasetDelete> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to delete', required: true}),
  }

  static description = 'Delete a dataset'

  static examples = [
    '<%= config.bin %> dataset delete 12345',
    '<%= config.bin %> dataset delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetDelete)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete dataset ${args.datasetId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/datasets/${args.datasetId}`, this.accountHeaders)

    this.log(`Dataset ${args.datasetId} deleted.`)
  }
}
