import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
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
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    role: Flags.string({description: 'Filter by role', options: ['admin', 'user']}),
    search: Flags.string({description: 'Search by name or email'}),
    'sort-by': Flags.string({description: 'Field to sort by'}),
    'sort-order': Flags.string({description: 'Sort direction', options: ['asc', 'desc']}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.role) query.role = this.flags.role
    if (this.flags['sort-by']) query.sortBy = this.flags['sort-by']
    if (this.flags['sort-order']) query.sortOrder = this.flags['sort-order']

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
