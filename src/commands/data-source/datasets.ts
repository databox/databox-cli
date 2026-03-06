import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Dataset {
  created: string
  id: string
  title: string | null
}

interface DatasetsResponse {
  datasets: Dataset[]
}

export default class DataSourceDatasets extends BaseCommand<typeof DataSourceDatasets> {
  static args = {
    dataSourceId: Args.string({
      description: 'ID of the data source',
      required: true,
    }),
  }

  static description = 'List datasets for a data source'

  static examples = [
    '<%= config.bin %> data-source datasets 12345',
    '<%= config.bin %> data-source datasets 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceDatasets)

    const response = await this.apiClient.get<DatasetsResponse>(`/v1/data-sources/${args.dataSourceId}/datasets`)

    formatOutput(
      response.datasets,
      [
        {header: 'ID', key: 'id'},
        {header: 'Title', key: 'title'},
        {header: 'Created', key: 'created'},
      ],
      this.flags.json,
    )
  }
}
