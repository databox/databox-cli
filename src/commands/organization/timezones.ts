import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Timezone {
  offset: string
  timezone: string
}

/** AccountResponse.cs `TimezoneListResponse`: every timezone at once, with no pagination. */
interface TimezoneListResponse {
  items: Timezone[]
}

export default class OrganizationTimezones extends BaseCommand<typeof OrganizationTimezones> {
  static description = 'List all supported timezones'

  static examples = [
    '<%= config.bin %> organization timezones',
    '<%= config.bin %> organization timezones --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<TimezoneListResponse>('/v2/organization/timezones', undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Offset', key: 'offset'},
        {header: 'Timezone', key: 'timezone'},
      ],
      this.outputFormat,
    )
  }
}
