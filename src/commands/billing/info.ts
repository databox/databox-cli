import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface BillingResponse {
  billingEmail: string | null
  billingPeriod: string
  planName: string
  planStatus: string
}

export default class BillingInfo extends BaseCommand<typeof BillingInfo> {
  static description = 'Show billing and plan details'

  static examples = [
    '<%= config.bin %> billing info',
    '<%= config.bin %> billing info --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<BillingResponse>('/v2/billing', undefined, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
