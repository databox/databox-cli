import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface DataSource {
  connectionId: number | null
  id: number
  integrationKey: string | null
  statusInfo: Record<string, unknown> | null
  timezone: string | null
  title: string | null
}

interface DataSourceListResponse {
  items: DataSource[]
  pagination?: {page: number; pageSize: number; totalItems: number}
}

export default class AccountDataSources extends BaseCommand<typeof AccountDataSources> {
  static description = 'List data sources for the current account'

  static examples = [
    '<%= config.bin %> account data-sources',
    '<%= config.bin %> account data-sources --page 0 --page-size 10',
    '<%= config.bin %> account data-sources --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<DataSourceListResponse>(
      '/v2/data-sources',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Title', key: 'title'},
        {header: 'Integration', key: 'integrationKey'},
        {header: 'Timezone', key: 'timezone'},
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
