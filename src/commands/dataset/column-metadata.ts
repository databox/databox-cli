import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface ColumnMeta {
  columnId: string
  description: string | null
  displayName: string | null
}

export default class DatasetColumnMetadata extends BaseCommand<typeof DatasetColumnMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Get column metadata for a dataset'

  static examples = [
    '<%= config.bin %> dataset column-metadata 12345',
    '<%= config.bin %> dataset column-metadata 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetColumnMetadata)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<ColumnMeta[]>(`/v2/datasets/${args.datasetId}/column-metadata`, undefined, this.accountHeaders)

    formatOutput(
      response,
      [
        {header: 'Column ID', key: 'columnId'},
        {header: 'Display Name', get: (row) => row.displayName ?? ''},
        {header: 'Description', get: (row) => row.description ?? ''},
      ],
      this.flags.json,
    )
  }
}
