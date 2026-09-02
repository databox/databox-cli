import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetSetMetadata extends BaseCommand<typeof DatasetSetMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Update metadata for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-metadata 12345 --description "Revenue tracking"',
    '<%= config.bin %> dataset set-metadata 12345 --tags \'["finance","quarterly"]\'',
  ]

  static flags = {
    description: Flags.string({description: 'Dataset description'}),
    tags: Flags.string({description: 'JSON array of tags'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetMetadata)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body: Record<string, unknown> = {}
    if (flags.description !== undefined) body.description = flags.description
    if (flags.tags) body.tags = JSON.parse(flags.tags) as string[]

    const response = await this.apiClient.patch(`/v2/datasets/${args.datasetId}/metadata`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
