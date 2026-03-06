import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DatasetCreateResponse {
  created: string | null
  id: string | null
  title: string | null
}

export default class DatasetCreate extends BaseCommand<typeof DatasetCreate> {
  static description = 'Create a new dataset'

  static examples = [
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --primary-keys date --primary-keys campaign',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --schema \'[{"name":"date","dataType":"datetime"},{"name":"value","dataType":"number"}]\'',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --json',
  ]

  static flags = {
    'data-source-id': Flags.string({
      description: 'ID of the data source to associate with',
      required: true,
    }),
    'primary-keys': Flags.string({
      description: 'Primary key column names',
      multiple: true,
    }),
    schema: Flags.string({
      description: 'JSON string of schema columns (array of {name, dataType})',
    }),
    title: Flags.string({
      description: 'Title of the dataset',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(DatasetCreate)

    const body: Record<string, unknown> = {
      dataSourceId: Number(flags['data-source-id']),
      title: flags.title,
    }

    if (flags['primary-keys']) {
      body.primaryKeys = flags['primary-keys']
    }

    if (flags.schema) {
      body.schema = JSON.parse(flags.schema) as Array<{dataType: 'datetime' | 'number' | 'string'; name: string}>
    }

    const response = await this.apiClient.post<DatasetCreateResponse>('/v1/datasets', body)

    formatSingle(response, this.flags.json)
  }
}
