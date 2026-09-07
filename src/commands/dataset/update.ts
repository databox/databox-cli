import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetUpdate extends BaseCommand<typeof DatasetUpdate> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to update', required: true}),
  }

  static description = 'Update a dataset'

  static examples = [
    '<%= config.bin %> dataset update 12345 --name "New Name"',
    '<%= config.bin %> dataset update 12345 --name "New Name" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New name for the dataset'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetUpdate)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body: Record<string, unknown> = {}
    if (flags.name !== undefined) body.name = flags.name

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name).', {exit: 1})
    }

    const response = await this.apiClient.patch<Record<string, unknown>>(`/v2/datasets/${args.datasetId}`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
