import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, addSorting, paginationFlags, sortFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface User {
  email: string
  id: number
  name: string
  role: string
}

interface UsersResponse {
  items: User[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class UserList extends BaseCommand<typeof UserList> {
  static description = 'List users in the account'

  static examples = [
    '<%= config.bin %> user list',
    '<%= config.bin %> user list --json',
  ]

  static flags = {
    ...paginationFlags,
    role: Flags.string({description: 'Filter by role', options: ['admin', 'user']}),
    search: Flags.string({description: 'Search by name or email'}),
    ...sortFlags,
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    addPagination(query, this.flags)
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.role) query.role = this.flags.role
    addSorting(query, this.flags)

    const response = await this.apiClient.get<UsersResponse>(
      '/v2/users',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Email', key: 'email'},
        {header: 'Role', key: 'role'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
