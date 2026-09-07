import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Dataset {
  datasetType: string
  id: number
  name: string | null
  statusInfo: {status: string} | null
}

interface DatasetsResponse {
  items: Dataset[]
  pagination?: {page: number; pageSize: number; totalItems: number}
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
    '<%= config.bin %> data-source datasets 12345 --page 0 --page-size 10',
    '<%= config.bin %> data-source datasets 12345 --json',
  ]

  static flags = {
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceDatasets)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const query: Record<string, string | number | undefined> = {
      dataSourceId: args.dataSourceId,
    }
    addPagination(query, this.flags)

    const response = await this.apiClient.get<DatasetsResponse>('/v2/datasets', query, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Type', key: 'datasetType'},
        {get: (row) => row.statusInfo?.status ?? '', header: 'Status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
