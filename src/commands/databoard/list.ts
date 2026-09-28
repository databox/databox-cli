import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Pagination, fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Databoard {
  id: number
  integrationKeys: string[]
  name: string
  tags: string[]
}

interface DataboardsResponse {
  items: Databoard[]
  pagination?: Pagination
}

export default class DataboardList extends BaseCommand<typeof DataboardList> {
  static description = 'List databoards'

  static examples = [
    '<%= config.bin %> databoard list',
    '<%= config.bin %> databoard list --search marketing',
    '<%= config.bin %> databoard list --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by databoard name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DataboardsResponse>('/v2/databoards', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.tags ?? []).join(', '), header: 'Tags'},
        {get: row => (row.integrationKeys ?? []).join(', '), header: 'Integrations'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
