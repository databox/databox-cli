import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Client {
  accountType: string
  id: number
  name: string
}

interface ClientsResponse {
  items: Client[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class ClientList extends BaseCommand<typeof ClientList> {
  static description = 'List client accounts'

  static examples = [
    '<%= config.bin %> client list',
    '<%= config.bin %> client list --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<ClientsResponse>(
      '/v2/clients',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Account Type', key: 'accountType'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
