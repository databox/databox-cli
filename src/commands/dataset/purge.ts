import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

interface DatasetPurgeResponse {
  message: string
}

export default class DatasetPurge extends BaseCommand<typeof DatasetPurge> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to purge data from', required: true}),
  }

  static description = 'Purge all data from a dataset'

  static examples = [
    '<%= config.bin %> dataset purge abc-123',
    '<%= config.bin %> dataset purge abc-123 --force',
  ]

  static flags = {
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetPurge)

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to purge all data from dataset ${args.datasetId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    const response = await this.apiClient.post<DatasetPurgeResponse>(`/v1/datasets/${args.datasetId}/purge`)

    this.log(response.message)
  }
}
