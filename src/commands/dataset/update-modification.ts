import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {printModification} from '../../lib/modification-table.js'
import {DatasetModification} from '../../lib/types.js'

export default class DatasetUpdateModification extends BaseCommand<typeof DatasetUpdateModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Create or replace a dataset's modification

This replaces the whole definition: a field left out of --data is cleared, not kept. To change part of it, start from "dataset modifications <id> --json" and send it back edited.

--data takes any of these keys:
- filters: per column, {"logicalOperator": "AND", "conditions": [{"type": "greater_than", "value": 100}]}
- formulas: computed columns, {"<col>": "$amount * 1.2"}
- displayNames: column renames, {"<col>": "Revenue"}
- dataTypes: per column, {"outputLogicalType": "currency", "inputFormat": ..., "outputFormat": {"type": ..., "scale": ...}}, the last two optional
- order: column IDs in display order
- visibility: {"<col>": false} hides a column

Prints the saved definition, one row per column as "dataset modifications" does.

"dataset modification-rules" lists the filter operators and type conversions each column type accepts; "dataset modification-functions" lists the formula functions.`

  static examples = [
    '<%= config.bin %> dataset update-modification 12345 --data \'{"filters":{"amount":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}}}\'',
    '<%= config.bin %> dataset update-modification 12345 --data \'{"formulas":{"totalWithTax":"$amount * 1.2"},"displayNames":{"amount":"Revenue"}}\'',
    '<%= config.bin %> dataset update-modification 12345 --data \'{"dataTypes":{"amount":{"outputLogicalType":"currency"}},"visibility":{"orderId":false}}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON modification definition: filters, formulas, displayNames, dataTypes, order, visibility',
      required: true,
    }),
    ...idempotencyFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetUpdateModification)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body = this.parseJsonFlag<Record<string, unknown>>(
      this.flags.data,
      'data',
      '{"filters":{"<col>":{"logicalOperator":"AND","conditions":[{"type":"greater_than","value":100}]}},"displayNames":{"<col>":"..."}}',
    )

    const response = await this.apiClient.put<DatasetModification>(`/v2/datasets/${args.datasetId}/modifications`, body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    printModification(response, this.outputFormat)
  }
}
