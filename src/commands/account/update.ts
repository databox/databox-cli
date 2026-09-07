import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface AccountResponse {
  accountType: string
  companyName: null | string
  id: number
  name: string
}

export default class AccountUpdate extends BaseCommand<typeof AccountUpdate> {
  static description = 'Update account details'

  static examples = [
    '<%= config.bin %> account update --name "My Company"',
    '<%= config.bin %> account update --company-name "Acme Inc" --json',
  ]

  static flags = {
    address: Flags.string({description: 'JSON object: {street, zip, city, state, country}'}),
    'billing-name': Flags.string({description: 'Billing name'}),
    'company-name': Flags.string({description: 'Company name'}),
    metadata: Flags.string({
      description: 'JSON object: {industry, businessType, companySize, annualRevenue}',
    }),
    name: Flags.string({description: 'Account name'}),
    settings: Flags.string({
      description: 'JSON object: {dateFormat, numberFormat, firstDayOfWeek, calendar}',
    }),
    'tax-number': Flags.string({description: 'Tax number'}),
    'website-url': Flags.string({description: 'Website URL'}),
  }

  async run(): Promise<void> {
    const body: Record<string, unknown> = {}
    if (this.flags.name !== undefined) body.name = this.flags.name
    if (this.flags['company-name'] !== undefined) body.companyName = this.flags['company-name']
    if (this.flags['website-url'] !== undefined) body.websiteUrl = this.flags['website-url']
    if (this.flags['tax-number'] !== undefined) body.taxNumber = this.flags['tax-number']
    if (this.flags['billing-name'] !== undefined) body.billingName = this.flags['billing-name']
    if (this.flags.address) body.address = this.parseJsonFlag(this.flags.address, 'address', '{"street":"...","city":"...","country":"..."}')
    if (this.flags.settings) body.settings = this.parseJsonFlag(this.flags.settings, 'settings', '{"dateFormat":"...","calendar":"..."}')
    if (this.flags.metadata) body.metadata = this.parseJsonFlag(this.flags.metadata, 'metadata', '{"industry":["..."],"companySize":"..."}')

    if (Object.keys(body).length === 0) {
      this.error(
        'Provide at least one field to update (--name, --company-name, --website-url, --tax-number, --billing-name, --address, --settings or --metadata).',
        {exit: 1},
      )
    }

    const response = await this.apiClient.patch<AccountResponse>('/v2/account', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
