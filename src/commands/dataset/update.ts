import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetUpdate extends BaseCommand<typeof DatasetUpdate> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to update', required: true}),
  }

  static description = 'Update a dataset'

  static examples = [
    '<%= config.bin %> dataset update 12345 --title "New Title"',
  ]

  static flags = {
    title: Flags.string({description: 'New title for the dataset'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetUpdate)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const body: Record<string, unknown> = {}
    if (flags.title) body.title = flags.title

    const response = await this.apiClient.patch(`/v2/datasets/${args.datasetId}`, body)

    formatSingle(response, this.flags.json)
  }
}
