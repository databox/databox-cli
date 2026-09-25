import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {Permissions} from '../../lib/types.js'

export default class DatasetPermissions extends BaseCommand<typeof DatasetPermissions> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Get permissions for a dataset'

  static examples = [
    '<%= config.bin %> dataset permissions 12345',
    '<%= config.bin %> dataset permissions 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(DatasetPermissions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.get<Permissions>(`/v2/datasets/${args.datasetId}/permissions`, undefined, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
