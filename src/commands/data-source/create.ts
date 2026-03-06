import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DataSource {
  created: string
  id: number
  ingestionSupported: boolean
  key: string | null
  timezone: string | null
  title: string | null
}

export default class DataSourceCreate extends BaseCommand<typeof DataSourceCreate> {
  static description = 'Create a new data source'

  static examples = [
    '<%= config.bin %> data-source create --title "My Data Source"',
    '<%= config.bin %> data-source create --title "My Data Source" --timezone "US/Eastern"',
    '<%= config.bin %> data-source create --title "My Data Source" --account-id 12345 --key my_source --json',
  ]

  static flags = {
    'account-id': Flags.string({
      description: 'Account ID to create the data source in',
    }),
    key: Flags.string({
      description: 'Unique key for the data source',
    }),
    timezone: Flags.string({
      description: 'Timezone for the data source',
    }),
    title: Flags.string({
      description: 'Title of the data source',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(DataSourceCreate)

    const body: Record<string, unknown> = {title: flags.title}
    if (flags['account-id']) {
      body.accountId = Number(flags['account-id'])
    }

    if (flags.timezone) {
      body.timezone = flags.timezone
    }

    if (flags.key) {
      body.key = flags.key
    }

    const response = await this.apiClient.post<DataSource>('/v1/data-sources', body)

    formatSingle(response, this.flags.json)
  }
}
