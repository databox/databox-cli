import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {ConnectionListItem} from '../../lib/types.js'

interface ConnectionsResponse {
  items: ConnectionListItem[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class ConnectionList extends BaseCommand<typeof ConnectionList> {
  static description = 'List connections'

  static examples = [
    '<%= config.bin %> connection list',
    '<%= config.bin %> connection list --search google',
    '<%= config.bin %> connection list --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by connection name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<ConnectionsResponse>('/v2/connections', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Integration', key: 'integrationKey'},
        {get: row => row.statusInfo?.status ?? '', header: 'Status'},
        {get: row => (row.sharedWithClients ? 'yes' : ''), header: 'Shared'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
