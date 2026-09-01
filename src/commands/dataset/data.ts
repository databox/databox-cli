import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

interface DataResponse {
  items: Record<string, unknown>[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class DatasetData extends BaseCommand<typeof DatasetData> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to get data from', required: true}),
  }

  static description = 'Get data from a dataset'

  static examples = [
    '<%= config.bin %> dataset data 12345',
    '<%= config.bin %> dataset data 12345 --page 0 --page-size 10',
    '<%= config.bin %> dataset data 12345 --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number (0-indexed)'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
  }

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetData)

    if (!/^\d+$/.test(args.datasetId)) {
      this.error('Dataset ID must be a numeric value.', {exit: 2})
    }

    const query: Record<string, string> = {}
    if (this.flags.page !== undefined) query.page = String(this.flags.page)
    if (this.flags['page-size'] !== undefined) query.pageSize = String(this.flags['page-size'])

    const response = await this.apiClient.get<DataResponse>(
      `/v2/datasets/${args.datasetId}/data`,
      Object.keys(query).length > 0 ? query : undefined,
    )

    if (this.flags.json) {
      console.log(JSON.stringify(response, null, 2))
    } else if (response.items.length === 0) {
      console.log('No data found.')
    } else {
      const keys = Object.keys(response.items[0])
      formatOutput(
        response.items,
        keys.map((k) => ({header: k, get: (row: Record<string, unknown>) => String(row[k] ?? '')})),
        false,
      )

      if (response.pagination) {
        const {page, pageSize, totalItems} = response.pagination
        const totalPages = Math.ceil(totalItems / pageSize)
        this.log(`Page ${page + 1} of ${totalPages} (${totalItems} total items)`)
      }
    }
  }
}
