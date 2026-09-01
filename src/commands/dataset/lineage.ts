import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetLineage extends BaseCommand<typeof DatasetLineage> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Show dataset lineage (parents and children)'

  static examples = [
    '<%= config.bin %> dataset lineage 12345',
    '<%= config.bin %> dataset lineage 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetLineage)
    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const response = await this.apiClient.get<Record<string, unknown>>(`/v2/datasets/${args.datasetId}/lineage`)

    formatSingle(response, this.flags.json)
  }
}
