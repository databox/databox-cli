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
    '<%= config.bin %> dataset set-column-metadata 12345 --columns \'[{"columnId":"revenue","displayName":"Revenue ($)"}]\' --json',
  ]

  static flags = {
    columns: Flags.string({
      description: 'JSON array of column metadata objects ({columnId, displayName?, description?})',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetColumnMetadata)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const columns = this.parseJsonFlag<Array<{columnId: string; description?: string; displayName?: string}>>(
      flags.columns,
      'columns',
      '[{"columnId":"...","description":"..."}]',
    )

    const response = await this.apiClient.patch<Record<string, unknown>>(`/v2/datasets/${args.datasetId}/column-metadata`, {columns}, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
