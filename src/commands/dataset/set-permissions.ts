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
    '<%= config.bin %> dataset set-permissions 12345 --access-level selectedUsers --access-list 31 --access-list 42',
  ]

  static flags = {
    'access-level': Flags.string({
      description: 'Access level',
      options: ['everyone', 'selectedUsers'],
      required: true,
    }),
    'access-list': Flags.integer({description: 'User ID granted access (repeat for several)', multiple: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetSetPermissions)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    // selectedUsers without an access list is rejected by the API, so catch it here
    // rather than after a round trip.
    if (flags['access-level'] === 'selectedUsers' && (flags['access-list'] ?? []).length === 0) {
      this.error('--access-list is required when --access-level is selectedUsers.', {exit: 2})
    }

    const response = await this.apiClient.put<Record<string, unknown>>(
      `/v2/datasets/${args.datasetId}/permissions`,
      flags['access-list']
        ? {accessLevel: flags['access-level'], accessList: flags['access-list']}
        : {accessLevel: flags['access-level']},
      this.accountHeaders,
    )

    formatSingle(response, this.flags.json)
  }
}
