import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DataSourceDetail {
  connectionId: number | null
  id: number
  integrationKey: string
  name: string
  timezone: string
}

export default class DataSourceCreate extends BaseCommand<typeof DataSourceCreate> {
  static description = 'Create a new data source'

  static examples = [
    '<%= config.bin %> data-source create --name "My Data Source"',
    '<%= config.bin %> data-source create --name "My Data Source" --timezone "US/Eastern"',
    '<%= config.bin %> data-source create --name "My Data Source" --integration-key Datadoo',
    '<%= config.bin %> data-source create --name "My Data Source" --json',
  ]

  static flags = {
    'integration-key': Flags.string({
      description: 'Integration key for the data source (e.g., Datadoo)',
    }),
    name: Flags.string({
      description: 'Name of the data source',
      required: true,
    }),
    timezone: Flags.string({
      description: 'Timezone for the data source',
    }),
  }

  async run(): Promise<void> {
    const body: Record<string, unknown> = {name: this.flags.name}

    if (this.flags.timezone) {
      body.timezone = this.flags.timezone
    }

    if (this.flags['integration-key']) {
      body.integrationKey = this.flags['integration-key']
    }

    const response = await this.apiClient.post<DataSourceDetail>('/v2/data-sources', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
