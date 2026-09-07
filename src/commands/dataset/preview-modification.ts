import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetPreviewModification extends BaseCommand<typeof DatasetPreviewModification> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Preview a dataset modification before applying'

  static examples = [
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"rules":{...}}\'',
    '<%= config.bin %> dataset preview-modification 12345 --data \'{"rules":{...}}\' --json',
  ]

  static flags = {
    data: Flags.string({
      description: 'JSON string with modification rules to preview',
      required: true,
    }),
    ...paginationFlags,
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetPreviewModification)
    this.requireNumericId(args.datasetId, 'Dataset ID')

    const body = this.parseJsonFlag<Record<string, unknown>>(this.flags.data, 'data', '{"columnFilters":{...}}')

    const response = await this.apiClient.post<Record<string, unknown>>(
      `/v2/datasets/${args.datasetId}/modifications/preview`,
      body,
      this.accountHeaders,
      {query: addPagination({}, this.flags)},
    )

    formatSingle(response, this.flags.json)
  }
}
