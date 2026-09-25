import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {
  Pagination, addSorting, fetchPaginated, paginationFlags, sortFlags,
} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {IntegrationListItem} from '../../lib/types.js'

interface IntegrationsResponse {
  items: IntegrationListItem[]
  pagination?: Pagination
}

export default class IntegrationList extends BaseCommand<typeof IntegrationList> {
  static description = 'List available integrations'

  static examples = [
    '<%= config.bin %> integration list',
    '<%= config.bin %> integration list --search google',
    '<%= config.bin %> integration list --json',
  ]

  static flags = {
    ...paginationFlags,
    search: Flags.string({description: 'Search by integration name'}),
    ...sortFlags(['name']),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    addSorting(query, this.flags)

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<IntegrationsResponse>('/v2/integrations', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Key', key: 'key'},
        {header: 'Name', key: 'name'},
        {get: row => (row.supportsDatasets ? 'yes' : 'no'), header: 'Datasets'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
