import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {UserListItem} from '../../lib/types.js'

interface UsersResponse {
  items: UserListItem[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class UserList extends BaseCommand<typeof UserList> {
  static description = 'List users in the organization'

  static examples = [
    '<%= config.bin %> user list',
    '<%= config.bin %> user list --role editor',
    '<%= config.bin %> user list --json',
  ]

  static flags = {
    ...paginationFlags,
    role: Flags.string({description: 'Filter by role', options: ['admin', 'user', 'editor', 'viewer']}),
    search: Flags.string({description: 'Search by name or email'}),
    ...sortFlags(),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.role) query.role = this.flags.role
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<UsersResponse>('/v2/users', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {header: 'Email', key: 'email'},
        {header: 'Role', key: 'role'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
