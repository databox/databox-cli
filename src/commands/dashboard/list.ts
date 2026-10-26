import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Pagination, fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {DataboardListItem} from '../../lib/types.js'

interface DashboardsResponse {
  items: DataboardListItem[]
  pagination?: Pagination
}

export default class DashboardList extends BaseCommand<typeof DashboardList> {
  static description = 'List dashboards'

  static examples = [
    '<%= config.bin %> dashboard list',
    '<%= config.bin %> dashboard list --search marketing',
    '<%= config.bin %> dashboard list --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by dashboard name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    // A blank search would list every dashboard, as if it were not given.
    if (this.flags.search !== undefined) {
      if (this.flags.search.trim() === '') this.error('--search cannot be empty.', {exit: 2})
      query.search = this.flags.search
    }

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<DashboardsResponse>('/v2/dashboards', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: row => (row.tags ?? []).join(', '), header: 'Tags'},
        {get: row => (row.integrationKeys ?? []).join(', '), header: 'Integrations'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
