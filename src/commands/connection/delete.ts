import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {confirm} from '../../lib/prompt.js'

export default class ConnectionDelete extends BaseCommand<typeof ConnectionDelete> {
  static args = {
    connectionId: Args.string({description: 'The connection ID to delete', required: true}),
  }

  static description = 'Delete a connection'

  static examples = [
    '<%= config.bin %> connection delete 12345',
    '<%= config.bin %> connection delete 12345 --force',
  ]

  static flags = {
    force: Flags.boolean({default: false, description: 'Skip confirmation prompt'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ConnectionDelete)
    this.requireNumericId(args.connectionId, 'Connection ID')

    if (!flags.force) {
      const confirmed = await confirm(`Are you sure you want to delete connection ${args.connectionId}?`)
      if (!confirmed) {
        this.log('Aborted.')
        return
      }
    }

    await this.apiClient.delete(`/v2/connections/${args.connectionId}`, this.accountHeaders)

    this.log(`Connection ${args.connectionId} deleted.`)
  }
}
