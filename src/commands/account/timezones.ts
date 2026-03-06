import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Timezone {
  offset: string
  timezone: string
}

interface TimezoneListResponse {
  timezones: Timezone[]
}

export default class AccountTimezones extends BaseCommand<typeof AccountTimezones> {
  static description = 'List all supported timezones'

  static examples = [
    '<%= config.bin %> account timezones',
    '<%= config.bin %> account timezones --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<TimezoneListResponse>('/v1/accounts/timezones')

    formatOutput(
      response.timezones,
      [
        {header: 'Offset', key: 'offset'},
        {header: 'Timezone', key: 'timezone'},
      ],
      this.flags.json,
    )
  }
}
