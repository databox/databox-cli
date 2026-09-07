import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  addPagination, addSorting, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Client {
  id: number
  isSelfManaged: boolean
  managedBy: {id: number; name: string} | null
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
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags,
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    addPagination(query, this.flags)
    if (this.flags.search) query.search = this.flags.search
    addSorting(query, this.flags)

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
        {get: row => (row.isSelfManaged ? 'yes' : ''), header: 'Self Managed'},
        {get: row => row.managedBy?.name ?? '', header: 'Managed By'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
