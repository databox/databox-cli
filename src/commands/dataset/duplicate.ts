import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {DatasetDetail} from '../../lib/types.js'

export default class DatasetDuplicate extends BaseCommand<typeof DatasetDuplicate> {
  static args = {
    datasetId: Args.string({description: 'The dataset ID to duplicate', required: true}),
  }

  static description = 'Duplicate a dataset (not supported for datasets created through the API)'

  static examples = [
    '<%= config.bin %> dataset duplicate 12345',
    '<%= config.bin %> dataset duplicate 12345 --json',
  ]

  static flags = {
    ...idempotencyFlags,
    name: Flags.string({description: 'Name for the duplicate (defaults to a server-generated name)'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DatasetDuplicate)

    this.requireNumericId(args.datasetId, 'Dataset ID')

    // Omitting --name falls back to a server-generated name; a blank one would silently do the same instead of erroring.
    if (flags.name !== undefined && flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const response = await this.apiClient.post<DatasetDetail>(
      `/v2/datasets/${args.datasetId}/duplicate`,
      flags.name === undefined ? undefined : {name: flags.name},
      {...this.accountHeaders, ...idempotencyHeaders(this.flags)},
    )

    formatSingle(response, this.outputFormat)
  }
}
