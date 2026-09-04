import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface DatasetCreateResponse {
  createdAt: string | null
  id: number | null
  title: string | null
}

export default class DatasetCreate extends BaseCommand<typeof DatasetCreate> {
  static description = 'Create a new dataset'

  static examples = [
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --primary-key date --primary-key campaign',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --schema \'[{"columnId":"date","dataType":"datetime"},{"columnId":"value","dataType":"number"}]\'',
    '<%= config.bin %> dataset create --title "My Dataset" --data-source-id 123 --json',
  ]

  static flags = {
    'data-source-id': Flags.string({
      description: 'ID of the data source to associate with',
      required: true,
    }),
    'primary-key': Flags.string({
      description: 'Primary key column names',
      multiple: true,
    }),
    schema: Flags.string({
      description: 'JSON string of schema columns (array of {columnId, dataType})',
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

    if (flags['primary-key']) {
      body.primaryKey = flags['primary-key']
    }

    if (flags.schema) {
      try {
        body.schema = JSON.parse(flags.schema) as Array<{columnId: string; dataType: 'datetime' | 'number' | 'string'}>
      } catch {
        this.error('Invalid JSON for --schema. Expected format: [{"columnId":"...","dataType":"..."}]', {exit: 2})
      }
    }

    const response = await this.apiClient.post<DatasetCreateResponse>('/v2/datasets', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
