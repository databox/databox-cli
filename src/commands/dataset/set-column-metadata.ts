import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetSetColumnMetadata extends BaseCommand<typeof DatasetSetColumnMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Update column metadata for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-column-metadata 12345 --columns \'[{"columnId":"revenue","displayName":"Revenue ($)"}]\'',
  ]

  static flags = {
    columns: Flags.string({
      description: 'JSON array of column metadata objects ({columnId, displayName?, description?})',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetColumnMetadata)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const columns = JSON.parse(flags.columns) as Array<{columnId: string; description?: string; displayName?: string}>

    const response = await this.apiClient.patch(`/v2/datasets/${args.datasetId}/column-metadata`, {columns})

    formatSingle(response, this.flags.json)
  }
}
