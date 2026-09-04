import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetSetPermissions extends BaseCommand<typeof DatasetSetPermissions> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID', required: true}),
  }

  static description = 'Set permissions for a dataset'

  static examples = [
    '<%= config.bin %> dataset set-permissions 12345 --access-level everyone',
    '<%= config.bin %> dataset set-permissions 12345 --access-level specific_users',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level (e.g., everyone, specific_users)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetPermissions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    const response = await this.apiClient.put<Record<string, unknown>>(
      `/v2/datasets/${args.datasetId}/permissions`,
      {accessLevel: flags['access-level']},
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
