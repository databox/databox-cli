import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Connection {
  id: number
  integrationKey: string | null
  name: string
  sharedWithClients: boolean
  statusInfo: {status: string} | null
}

interface ConnectionsResponse {
  items: Connection[]
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
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    addPagination(query, this.flags)

    const response = await this.apiClient.get<ConnectionsResponse>(
      '/v2/connections',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Integration', key: 'integrationKey'},
        {get: (row) => row.statusInfo?.status ?? '', header: 'Status'},
        {get: (row) => (row.sharedWithClients ? 'yes' : ''), header: 'Shared'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
