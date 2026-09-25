import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {printModification} from '../../lib/modification-table.js'
import {DatasetModification} from '../../lib/types.js'

export default class DatasetModifications extends BaseCommand<typeof DatasetModifications> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Show a dataset's modification definition

The table has one row per column, in the dataset's column order. --json returns the definition as the API does: {filters, formulas, displayNames, dataTypes, order, visibility}, the input "dataset update-modification" takes.`

  static examples = [
    '<%= config.bin %> dataset modifications 12345',
    '<%= config.bin %> dataset modifications 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetModifications)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<DatasetModification>(`/v2/datasets/${args.datasetId}/modifications`, undefined, this.accountHeaders)

    printModification(response, this.outputFormat)
  }
}
