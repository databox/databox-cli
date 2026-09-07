import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetDuplicate extends BaseCommand<typeof DatasetDuplicate> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to duplicate', required: true}),
  }

  static description = 'Duplicate a dataset'

  static examples = [
    '<%= config.bin %> dataset duplicate 12345',
    '<%= config.bin %> dataset duplicate 12345 --json',
  ]

  static flags = {
    name: Flags.string({description: 'Name for the duplicate (defaults to a server-generated name)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetDuplicate)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.post(
      `/v2/datasets/${args.datasetId}/duplicate`,
      flags.name ? {name: flags.name} : undefined,
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
