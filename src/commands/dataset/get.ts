import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DatasetGetResponse {
  columnCount: number
  createdAt: null | string
  datasetType: string
  id: number
  name: string
  // Column definitions are not on the detail payload — use `dataset schema ID`.
  parentDataSourceId: null | number
  primaryKey: null | string[]
  rowCount: number
  syncInterval: null | number
  timezone: null | string
}

export default class DatasetGet extends BaseCommand<typeof DatasetGet> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to retrieve', required: true}),
  }

  static description = 'Get details of a specific dataset'

  static examples = [
    '<%= config.bin %> dataset get 12345',
    '<%= config.bin %> dataset get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetGet)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<DatasetGetResponse>(`/v2/datasets/${args.datasetId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
