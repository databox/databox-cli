import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Dataset {
  createdAt: string
  id: number
  title: string | null
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
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceDatasets)

    const query: Record<string, string | number | undefined> = {
      dataSourceId: args.dataSourceId,
    }
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<DatasetsResponse>('/v2/datasets', query, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Title', key: 'title'},
        {header: 'Created', key: 'createdAt'},
      ],
      this.flags.json,
    )

    if (response.pagination && !this.flags.json) {
      const {page, pageSize, totalItems} = response.pagination
      const totalPages = Math.ceil(totalItems / pageSize)
      this.log(`Page ${page + 1} of ${totalPages} (${totalItems} total items)`)
    }
  }
}
