import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Dataset {
  created: string
  dataSourceId: number
  id: string
  title: string
}

interface DatasetListResponse {
  datasets: Dataset[]
}

export default class AccountDatasets extends BaseCommand<typeof AccountDatasets> {
  static args = {
    accountId: Args.string({description: 'The account ID to list datasets for', required: true}),
  }

  static description = 'List datasets for a specific account'

  static examples = [
    '<%= config.bin %> account datasets 12345',
    '<%= config.bin %> account datasets 12345 --type datasets',
    '<%= config.bin %> account datasets 12345 --page 1 --page-size 20',
    '<%= config.bin %> account datasets 12345 --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    type: Flags.string({description: 'Filter by dataset type', options: ['datasets', 'merged_datasets']}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(AccountDatasets)

    const query: Record<string, string> = {}
    if (this.flags.type) query.type = this.flags.type
    if (this.flags.page !== undefined) query.page = String(this.flags.page)
    if (this.flags['page-size'] !== undefined) query.pageSize = String(this.flags['page-size'])

    const response = await this.apiClient.get<DatasetListResponse>(
      `/v1/accounts/${args.accountId}/datasets`,
      Object.keys(query).length > 0 ? query : undefined,
    )

    formatOutput(
      response.datasets,
      [
        {header: 'ID', key: 'id'},
        {header: 'Data Source ID', key: 'dataSourceId'},
        {header: 'Title', key: 'title'},
        {header: 'Created', key: 'created'},
      ],
      this.flags.json,
    )
  }
}
