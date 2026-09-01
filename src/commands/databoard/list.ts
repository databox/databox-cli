import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Databoard {
  id: number
  name: string
  sourceTypes: string[]
  tags: string[]
}

interface DataboardsResponse {
  items: Databoard[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class DataboardList extends BaseCommand<typeof DataboardList> {
  static description = 'List databoards'

  static examples = [
    '<%= config.bin %> databoard list',
    '<%= config.bin %> databoard list --search marketing',
    '<%= config.bin %> databoard list --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    search: Flags.string({description: 'Search by databoard name'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string> = {}
    if (this.flags.search) query.search = this.flags.search
    if (this.flags.page !== undefined) query.page = String(this.flags.page)
    if (this.flags['page-size'] !== undefined) query.pageSize = String(this.flags['page-size'])

    const response = await this.apiClient.get<DataboardsResponse>(
      '/v2/databoards',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Name', key: 'name'},
        {get: (row) => row.tags.join(', '), header: 'Tags'},
        {get: (row) => row.sourceTypes.join(', '), header: 'Source Types'},
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
