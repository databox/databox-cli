import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Row, rowColumns} from '../../lib/dataset-rows.js'
import {
  Paginated, addSorting, dataPaginationFlags, fetchPaginated, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, formatSingle, showPagination} from '../../lib/output.js'
import {SchemaColumn} from '../../lib/types.js'

/** DatasetResponse.cs `DatasetDataResponse`. `items` and `schema` can be null. */
interface DataResponse extends Paginated<Row> {
  lastUpdatedAt: null | string
  schema: SchemaColumn[] | null
}

export default class DatasetData extends BaseCommand<typeof DatasetData> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to get data from', required: true}),
  }

  static description = `Get data from a dataset

Columns follow the dataset schema: in its order, headed by display name, without the columns a modification hid. --json returns the whole response: the rows under "items", with "schema" and "lastUpdatedAt".`

  static examples = [
    '<%= config.bin %> dataset data 12345',
    '<%= config.bin %> dataset data 12345 --page 0 --page-size 10',
    '<%= config.bin %> dataset data 12345 --sort-by amount --sort-order desc',
    '<%= config.bin %> dataset data 12345 --output csv > rows.csv',
    '<%= config.bin %> dataset data 12345 --json',
  ]

  static flags = {
    ...dataPaginationFlags,
    ...sortFlags(),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetData)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const query = addSorting({}, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DataResponse>(`/v2/datasets/${args.datasetId}/data`, pageQuery, this.accountHeaders), warning => this.warn(warning))

    // The rows come with the schema that describes them, so JSON keeps the whole response.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    const rows = response.items ?? []
    formatOutput(rows, rowColumns(response.schema, rows), this.outputFormat)

    showPagination(response.pagination ?? undefined, this.outputFormat)
  }
}
