import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface Country {
  code: string
  name: string
}

interface CountriesResponse {
  items: Country[]
}

export default class OrganizationCountries extends BaseCommand<typeof OrganizationCountries> {
  static description = 'List available countries'

  static examples = [
    '<%= config.bin %> organization countries',
    '<%= config.bin %> organization countries --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<CountriesResponse>('/v2/organization/countries', undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Code', key: 'code'},
        {header: 'Name', key: 'name'},
      ],
      this.outputFormat,
    )
  }
}
