import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class BillingInfo extends BaseCommand<typeof BillingInfo> {
  static description = 'Show billing and plan details'

  static examples = [
    '<%= config.bin %> billing info',
    '<%= config.bin %> billing info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get('/v2/billing')

    formatSingle(response, this.flags.json)
  }
}
