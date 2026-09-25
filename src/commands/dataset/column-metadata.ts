import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'
import {ColumnMetadataItem} from '../../lib/types.js'

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

    const response = await this.apiClient.get<{items: ColumnMetadataItem[]}>(`/v2/datasets/${args.datasetId}/column-metadata`, undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Column ID', key: 'id'},
        {header: 'Display Name', key: 'displayName'},
        {get: row => row.description ?? '', header: 'Description'},
        {get: row => row.conceptType ?? '', header: 'Concept Type'},
        {get: row => (row.synonyms ?? []).join(', '), header: 'Synonyms'},
      ],
      this.outputFormat,
    )
  }
}
