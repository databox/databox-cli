import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {DataSourceDetail} from '../../lib/types.js'

export default class DataSourceCreate extends BaseCommand<typeof DataSourceCreate> {
  static description = 'Create a new data source'

  static examples = [
    '<%= config.bin %> data-source create --name "My Data Source"',
    '<%= config.bin %> data-source create --name "My Data Source" --timezone "US/Eastern"',
    '<%= config.bin %> data-source create --name "My Data Source" --integration-key Datadoo',
    '<%= config.bin %> data-source create --name "My Data Source" --json',
  ]

  static flags = {
    ...idempotencyFlags,
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
    // The API rejects a blank name with a 400; catch it before the round trip.
    if (this.flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {name: this.flags.name}

    if (this.flags.timezone) {
      body.timezone = this.flags.timezone
    }

    if (this.flags['integration-key']) {
      body.integrationKey = this.flags['integration-key']
    }

    const response = await this.apiClient.post<DataSourceDetail>('/v2/data-sources', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    formatSingle(response, this.outputFormat)
  }
}
