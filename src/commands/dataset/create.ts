import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {DatasetDetail} from '../../lib/types.js'

export default class DatasetCreate extends BaseCommand<typeof DatasetCreate> {
  static description = 'Create a new dataset'

  static examples = [
    '<%= config.bin %> dataset create --name "My Dataset" --data-source-id 123',
    '<%= config.bin %> dataset create --name "My Dataset" --data-source-id 123 --primary-key date --primary-key campaign',
    '<%= config.bin %> dataset create --name "My Dataset" --data-source-id 123 --schema \'[{"id":"date","dataType":"datetime"},{"id":"value","dataType":"number"}]\'',
    '<%= config.bin %> dataset create --name "My Dataset" --data-source-id 123 --json',
  ]

  static flags = {
    'data-source-id': Flags.integer({
      description: 'ID of the data source to associate with',
      min: 1,
      required: true,
    }),
    ...idempotencyFlags,
    name: Flags.string({
      description: 'Name of the dataset',
      required: true,
    }),
    'primary-key': Flags.string({
      description: 'Primary key column names',
      multiple: true,
    }),
    schema: Flags.string({
      description: 'JSON array of schema columns, each {id, dataType} with dataType one of string, number, datetime',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(DatasetCreate)

    const body: Record<string, unknown> = {
      dataSourceId: flags['data-source-id'],
      name: flags.name,
    }

    if (flags['primary-key']) {
      body.primaryKey = flags['primary-key']
    }

    if (flags.schema) {
      body.schema = this.parseJsonFlag<Array<{dataType: 'datetime' | 'number' | 'string'; id: string}>>(
        flags.schema,
        'schema',
        '[{"id":"date","dataType":"datetime"}]',
      )
    }

    const response = await this.apiClient.post<DatasetDetail>('/v2/datasets', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    formatSingle(response, this.outputFormat)
  }
}
