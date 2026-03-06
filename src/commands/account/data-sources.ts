import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface DataSource {
  created: string
  id: number
  ingestionSupported: boolean
  key: string | null
  timezone: string | null
  title: string | null
}

interface DataSourceListResponse {
  dataSources: DataSource[]
}

export default class AccountDataSources extends BaseCommand<typeof AccountDataSources> {
  static args = {
    accountId: Args.string({description: 'The account ID to list data sources for', required: true}),
  }

  static description = 'List data sources for a specific account'

  static examples = [
    '<%= config.bin %> account data-sources 12345',
    '<%= config.bin %> account data-sources 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(AccountDataSources)

    const response = await this.apiClient.get<DataSourceListResponse>(
      `/v1/accounts/${args.accountId}/data-sources`,
    )

    formatOutput(
      response.dataSources,
      [
        {header: 'ID', key: 'id'},
        {header: 'Title', key: 'title'},
        {header: 'Created', key: 'created'},
        {header: 'Timezone', key: 'timezone'},
        {header: 'Key', key: 'key'},
        {get: (row) => String(row.ingestionSupported), header: 'Ingestion Supported'},
      ],
      this.flags.json,
    )
  }
}
