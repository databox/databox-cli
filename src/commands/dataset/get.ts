import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DatasetGetResponse {
  createdAt: string
  dataSourceId: number
  id: number
  primaryKey: string[] | null
  schema: Array<{columnId: string; dataType: string}> | null
  timezone: string | null
  title: string
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

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get<DatasetGetResponse>(`/v2/datasets/${args.datasetId}`)

    formatSingle(response, this.flags.json)
  }
}
