import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

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
  }

  async run(): Promise<void> {
    const query: Record<string, string> = {}
    if (this.flags.page !== undefined) query.page = String(this.flags.page)
    if (this.flags['page-size'] !== undefined) query.pageSize = String(this.flags['page-size'])

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

    if (response.pagination && !this.flags.json) {
      const {page, pageSize, totalItems} = response.pagination
      const totalPages = Math.ceil(totalItems / pageSize)
      this.log(`Page ${page + 1} of ${totalPages} (${totalItems} total items)`)
    }
  }
}
