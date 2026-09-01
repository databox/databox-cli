import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Timezone {
  offset: string
  timezone: string
}

interface TimezoneListResponse {
  items: Timezone[]
  pagination?: {page: number; pageSize: number; totalItems: number}
}

export default class AccountTimezones extends BaseCommand<typeof AccountTimezones> {
  static description = 'List all supported timezones'

  static examples = [
    '<%= config.bin %> account timezones',
    '<%= config.bin %> account timezones --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<TimezoneListResponse>('/v2/account/timezones')

    formatOutput(
      response.items,
      [
        {header: 'Offset', key: 'offset'},
        {header: 'Timezone', key: 'timezone'},
      ],
      this.flags.json,
    )
  }
}
