import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {AccountListItem} from '../../lib/types.js'

interface AccountsResponse {
  items: AccountListItem[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class AccountList extends BaseCommand<typeof AccountList> {
  static description = `List accounts in your organization

--sort-by takes name, website or managedBy. The CLI does not restrict it: the value is passed to the API as given.`

  static examples = [
    '<%= config.bin %> account list',
    '<%= config.bin %> account list --sort-by name --sort-order asc',
    '<%= config.bin %> account list --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by name'}),
    ...sortFlags(),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<AccountsResponse>('/v2/accounts', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.isSelfManaged ? 'yes' : ''), header: 'Self Managed'},
        {get: row => row.managedBy?.name ?? '', header: 'Managed By'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
