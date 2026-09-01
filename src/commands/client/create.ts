import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ClientCreate extends BaseCommand<typeof ClientCreate> {
  static description = 'Create a client account'

  static examples = [
    '<%= config.bin %> client create --name "Client Company"',
    '<%= config.bin %> client create --name "Client Company" --json',
  ]

  static flags = {
    name: Flags.string({description: 'Name of the client account', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ClientCreate)

    const response = await this.apiClient.post('/v2/clients', {
      name: flags.name,
    }, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
