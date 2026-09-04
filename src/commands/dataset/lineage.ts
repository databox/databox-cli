import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface LineageResponse {
  children: Array<{datasetType: string | null; id: number; title: string; type: string}>
  id: number
  parents: Array<{datasetType: string | null; id: number; title: string; type: string}>
}

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
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<LineageResponse>(`/v2/datasets/${args.datasetId}/lineage`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
