import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Row, rowColumns} from '../../lib/dataset-rows.js'
import {addSorting, sortFlags} from '../../lib/flags.js'
import {formatOutput, formatSingle} from '../../lib/output.js'
import {SchemaColumn} from '../../lib/types.js'

/** ingestion-api previews PaginationConstants.DefaultDataPageSize rows; the route takes no page size. */
const PREVIEW_ROWS = 200

/** DatasetResponse.cs `ModificationPreviewResponse`. */
interface PreviewResponse {
  items: Row[] | null
  pagination: {totalItems: number}
  schema: SchemaColumn[] | null
}

export default class DatasetPreviewModification extends BaseCommand<typeof DatasetPreviewModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Preview a dataset modification without saving it

--data takes the same definition as "dataset update-modification". The preview is a sample, not a paged read: it shows up to ${PREVIEW_ROWS} rows and how many matched in all. Use "dataset data" to page through a dataset. --json returns the whole response: {items, pagination: {totalItems}, schema}.`

  static examples = [
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"filters":{"amount":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}\'',
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"formulas":{"totalWithTax":"$amount * 1.2"}}\' --sort-by totalWithTax --sort-order desc',
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"displayNames":{"amount":"Revenue"}}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON modification definition to preview: filters, formulas, displayNames, dataTypes, order, visibility',
      required: true,
    }),
    ...sortFlags(),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetPreviewModification)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body = this.parseJsonFlag<Record<string, unknown>>(
      this.flags.data,
      'data',
      '{"filters":{"<col>":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}',
    )

    const response = await this.apiClient.post<PreviewResponse>(
      `/v2/datasets/${args.datasetId}/modifications/preview`,
      body,
      this.accountHeaders,
      {query: addSorting({}, this.flags)},
    )

    // The rows come with their schema and total, so JSON keeps the whole response.
    if (this.outputFormat === 'json') {
      formatSingle(response, this.outputFormat)
      return
    }

    const rows = response.items ?? []
    formatOutput(rows, rowColumns(response.schema, rows), this.outputFormat)

    // A line after the rows would corrupt a CSV stream.
    if (this.outputFormat === 'table') {
      this.log(`${response.pagination.totalItems} rows matched (showing up to ${PREVIEW_ROWS}).`)
    }
  }
}
