import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DatasetGetResponse {
  created: string
  dataSourceId: number
  id: string | null
  primaryKeys: string[] | null
  schema: Array<{dataType: string; name: string}> | null
  timezone: string | null
}

export default class DatasetGet extends BaseCommand<typeof DatasetGet> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to retrieve', required: true}),
  }

  static description = 'Get details of a specific dataset'

  static examples = [
    '<%= config.bin %> dataset get abc-123',
    '<%= config.bin %> dataset get abc-123 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetGet)

    const response = await this.apiClient.get<DatasetGetResponse>(`/v1/datasets/${args.datasetId}`)

    formatSingle(response, this.flags.json)
  }
}
