import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DataSourceDetail {
  connectionId: number | null
  id: number
  integrationKey: string
  timezone: string
  title: string
}

export default class DataSourceCreate extends BaseCommand<typeof DataSourceCreate> {
  static description = 'Create a new data source'

  static examples = [
    '<%= config.bin %> data-source create --title "My Data Source"',
    '<%= config.bin %> data-source create --title "My Data Source" --timezone "US/Eastern"',
    '<%= config.bin %> data-source create --title "My Data Source" --key Datadoo',
    '<%= config.bin %> data-source create --title "My Data Source" --json',
  ]

  static flags = {
    key: Flags.string({
      description: 'Integration key for the data source (e.g., Datadoo)',
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
    const body: Record<string, unknown> = {title: this.flags.title}

    if (this.flags.timezone) {
      body.timezone = this.flags.timezone
    }

    if (this.flags.key) {
      body.key = this.flags.key
    }

    const response = await this.apiClient.post<DataSourceDetail>('/v2/data-sources', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
