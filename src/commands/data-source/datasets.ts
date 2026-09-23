import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  Pagination, addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {DatasetListItem} from '../../lib/types.js'

interface DatasetsResponse {
  items: DatasetListItem[]
  pagination: Pagination
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
    '<%= config.bin %> data-source datasets 12345 --search "orders" --sort-by name',
    '<%= config.bin %> data-source datasets 12345 --page 0 --page-size 10',
    '<%= config.bin %> data-source datasets 12345 --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags(['name', 'createdAt', 'lastActivityAt']),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DataSourceDatasets)
    this.requireNumericId(args.dataSourceId, 'Data source ID')

    const query: Record<string, number | string | undefined> = {
      dataSourceId: args.dataSourceId,
    }
    if (this.flags.search) query.search = this.flags.search
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DatasetsResponse>('/v2/datasets', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.ingestionSupported ? 'yes' : 'no'), header: 'Ingestion'},
        {get: row => row.statusInfo?.status ?? '', header: 'Status'},
        {get: row => row.syncInfo?.status ?? '', header: 'Sync status'},
        {get: row => row.lastActivityAt ?? '', header: 'Last activity'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
