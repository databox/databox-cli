import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class DatasetClearModifications extends BaseCommand<typeof DatasetClearModifications> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Clear all modifications from a dataset'

  static examples = [
    '<%= config.bin %> dataset clear-modifications 12345',
    '<%= config.bin %> dataset clear-modifications 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetClearModifications)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to clear all modifications from dataset ${args.datasetId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/datasets/${args.datasetId}/modifications`)

    this.log(`Modifications cleared for dataset ${args.datasetId}.`)
  }
}
