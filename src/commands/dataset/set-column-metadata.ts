import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'
import {ColumnMetadataItem} from '../../lib/types.js'

interface ColumnMetadataUpdate {
  conceptType?: 'dimension' | 'measure' | 'timeDimension'
  description?: string
  id: string
  synonyms?: string[]
}

export default class DatasetSetColumnMetadata extends BaseCommand<typeof DatasetSetColumnMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Update column metadata for a dataset

--columns takes at least one column. Each column is {id, description?, conceptType?, synonyms?}. conceptType is measure, dimension or timeDimension; synonyms is an array of alternative names. Display names are not set here: rename a column through "dataset update-modification" (displayNames). Prints the dataset's column metadata after the update.`

  static examples = [
    '<%= config.bin %> dataset set-column-metadata 12345 --columns \'[{"id":"revenue","description":"Order value in USD","conceptType":"measure"}]\'',
    '<%= config.bin %> dataset set-column-metadata 12345 --columns \'[{"id":"country","conceptType":"dimension","synonyms":["nation","market"]}]\' --json',
  ]

  static flags = {
    columns: Flags.string({
      description: 'JSON array of at least one column metadata update ({id, description?, conceptType?, synonyms?})',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetColumnMetadata)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const columns = this.parseJsonFlag<ColumnMetadataUpdate[]>(
      flags.columns,
      'columns',
      '[{"id":"revenue","description":"...","conceptType":"measure","synonyms":["sales"]}]',
    )

    if (Array.isArray(columns) && columns.length === 0) {
      this.error('At least one column must be provided.', {exit: 2})
    }

    const response = await this.apiClient.patch<{items: ColumnMetadataItem[]}>(`/v2/datasets/${args.datasetId}/column-metadata`, {columns}, this.accountHeaders)

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
