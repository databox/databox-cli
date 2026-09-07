import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class ClientDelete extends BaseCommand<typeof ClientDelete> {
  static args = {
    clientId: Args.string({description: 'The client account ID to delete', required: true}),
  }

  static description = 'Delete a client account'

  static examples = [
    '<%= config.bin %> client delete 12345',
    '<%= config.bin %> client delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({default: false, description: 'Skip confirmation prompt'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ClientDelete)
    this.requireNumericId(args.clientId, 'Client ID')

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete client account ${args.clientId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/clients/${args.clientId}`, this.accountHeaders)

    this.log(`Client account ${args.clientId} deleted.`)
  }
}
