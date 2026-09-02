import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Connection {
  id: number
  integrationKey: string
  name: string
  status: string
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
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    search: Flags.string({description: 'Search by connection name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

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
        {header: 'Status', key: 'status'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
