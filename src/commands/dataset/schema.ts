import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface SchemaColumn {
  columnId: string
  dataType: string
}

interface SchemaResponse {
  items: SchemaColumn[]
}

export default class DatasetSchema extends BaseCommand<typeof DatasetSchema> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Get the schema of a dataset'

  static examples = [
    '<%= config.bin %> dataset schema 12345',
    '<%= config.bin %> dataset schema 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetSchema)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<SchemaResponse>(`/v2/datasets/${args.datasetId}/schema`, undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Column ID', key: 'columnId'},
        {header: 'Data Type', key: 'dataType'},
      ],
      this.flags.json,
    )
  }
}
