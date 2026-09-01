import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ClientGet extends BaseCommand<typeof ClientGet> {
  static args = {
    clientId: Args.string({description: 'The client account ID', required: true}),
  }

  static description = 'Get client account details'

  static examples = [
    '<%= config.bin %> client get 12345',
    '<%= config.bin %> client get 12345 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(ClientGet)

    const response = await this.apiClient.get(`/v2/clients/${args.clientId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
