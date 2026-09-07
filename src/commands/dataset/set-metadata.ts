import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetSetMetadata extends BaseCommand<typeof DatasetSetMetadata> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Update metadata for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-metadata 12345 --description "Revenue tracking"',
    '<%= config.bin %> dataset set-metadata 12345 --synonyms \'["finance","quarterly"]\'',
  ]

  static flags = {
    'default-time-dimension': Flags.string({description: 'Column ID to use as the default time dimension'}),
    description: Flags.string({description: 'Dataset description'}),
    synonyms: Flags.string({description: 'JSON array of synonyms'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetMetadata)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body: Record<string, unknown> = {}
    if (flags.description !== undefined) body.description = flags.description
    if (flags.synonyms) {
      body.synonyms = this.parseJsonFlag<string[]>(flags.synonyms, 'synonyms', '["name1","name2"]')
    }

    if (flags['default-time-dimension'] !== undefined) {
      body.defaultTimeDimension = flags['default-time-dimension']
    }

    if (Object.keys(body).length === 0) {
      this.error(
        'Provide at least one field to update (--description, --synonyms or --default-time-dimension).',
        {exit: 1},
      )
    }

    const response = await this.apiClient.patch<Record<string, unknown>>(`/v2/datasets/${args.datasetId}/metadata`, body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
