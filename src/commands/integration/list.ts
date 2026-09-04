import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface Integration {
  id: number
  key: string
  name: string
  supportsDatasets: boolean
}

interface IntegrationsResponse {
  items: Integration[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class IntegrationList extends BaseCommand<typeof IntegrationList> {
  static description = 'List available integrations'

  static examples = [
    '<%= config.bin %> integration list',
    '<%= config.bin %> integration list --search google',
    '<%= config.bin %> integration list --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    search: Flags.string({description: 'Search by integration name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<IntegrationsResponse>(
      '/v2/integrations',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Key', key: 'key'},
        {header: 'Name', key: 'name'},
        {get: (row) => String(row.supportsDatasets), header: 'Datasets'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
