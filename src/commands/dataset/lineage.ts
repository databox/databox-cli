import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {Lineage, printLineage} from '../../lib/lineage.js'

/** DatasetResponse.cs `DatasetLineageResponse`. */
interface LineageResponse extends Lineage {
  id: number
}

export default class DatasetLineage extends BaseCommand<typeof DatasetLineage> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = `Show dataset lineage (parents and children)

Parents are the data sources and datasets this dataset is built from; children are the datasets and metrics built from it. Type is dataSource, dataset, mergedDataset, basicMetric or customMetric. A metric's ID is its key, so IDs are strings.`

  static examples = [
    '<%= config.bin %> dataset lineage 12345',
    '<%= config.bin %> dataset lineage 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetLineage)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<LineageResponse>(`/v2/datasets/${args.datasetId}/lineage`, undefined, this.accountHeaders)

    printLineage(response, this.outputFormat)
  }
}
