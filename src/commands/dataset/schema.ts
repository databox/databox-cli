import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, formatSingle} from '../../lib/output.js'
import {SchemaColumn} from '../../lib/types.js'

/**
 * DatasetResponse.cs `DatasetSchemaListResponse`. `primaryKey` is left off for a dataset that
 * cannot have one, and is empty for an ingestion dataset created without one.
 */
interface SchemaResponse {
  items: SchemaColumn[]
  primaryKey?: null | string[]
}

export default class DatasetSchema extends BaseCommand<typeof DatasetSchema> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Get the schema of a dataset

The table is followed by the primary key: "n/a" for a dataset that cannot have one, "none" for an ingestion dataset created without one. --json returns the whole response, {items, primaryKey}.`

  static examples = [
    '<%= config.bin %> dataset schema 12345',
    '<%= config.bin %> dataset schema 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSchema)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<SchemaResponse>(`/v2/datasets/${args.datasetId}/schema`, undefined, this.accountHeaders)

    // primaryKey sits beside items, so JSON keeps the whole response.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Display Name', key: 'displayName'},
        {header: 'Data Type', key: 'dataType'},
        {get: row => String(row.order), header: 'Order'},
        {get: row => (row.visible ? 'yes' : 'no'), header: 'Visible'},
      ],
      this.outputFormat,
    )

    // A line after the rows would corrupt a CSV stream.
    if (this.outputFormat === 'table') {
      const {primaryKey} = response
      const display = primaryKey ? (primaryKey.length === 0 ? 'none' : primaryKey.join(', ')) : 'n/a'
      this.log(`Primary key: ${display}`)
    }
  }
}
