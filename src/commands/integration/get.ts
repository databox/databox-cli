import {Args} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class IntegrationGet extends BaseCommand<typeof IntegrationGet> {
  static args = {
    integrationId: Args.string({description: 'The integration ID', required: true}),
  }

  static description = 'Get integration details'

  static examples = [
    '<%= config.bin %> integration get 101',
    '<%= config.bin %> integration get 101 --json',
  ]

  async run(): Promise<void> {
    const {args} = await this.parse(IntegrationGet)
    this.requireNumericId(args.integrationId, 'Integration ID')

    const response = await this.apiClient.get(`/v2/integrations/${args.integrationId}`, undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
