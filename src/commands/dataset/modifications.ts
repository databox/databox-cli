import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Modification {
  columnId: string
  id: number
  type: string
}

export default class DatasetModifications extends BaseCommand<typeof DatasetModifications> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'List modifications for a dataset'

  static examples = [
    '<%= config.bin %> dataset modifications 12345',
    '<%= config.bin %> dataset modifications 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetModifications)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get<Modification[]>(`/v2/datasets/${args.datasetId}/modifications`)

    formatOutput(
      response,
      [
        {header: 'ID', key: 'id'},
        {header: 'Column', key: 'columnId'},
        {header: 'Type', key: 'type'},
      ],
      this.flags.json,
    )
  }
}
