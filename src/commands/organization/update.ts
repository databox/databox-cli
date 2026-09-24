import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {AccountResponse} from '../../lib/types.js'

export default class AccountUpdate extends BaseCommand<typeof AccountUpdate> {
  static description = `Update account details

--settings takes {dateFormat, numberFormat, firstDayOfWeek, calendar, fiscalYearStart}:
- numberFormat: GroupingCommaDecimalDot (1,234.5), GroupingDotDecimalComma (1.234,5), GroupingSpaceDecimalComma (1 234,5) or GroupingSpaceDecimalDot (1 234.5). An unrecognised value is stored as GroupingCommaDecimalDot.
- firstDayOfWeek: sunday, monday, tuesday, wednesday, thursday, friday or saturday. An unrecognised value keeps the current day.
- calendar: gregorian, customFiscal or weekAlignedFiscal.
- fiscalYearStart: {month, day}, for a fiscal calendar only; switching to gregorian clears it.`

  static examples = [
    '<%= config.bin %> account update --name "My Company"',
    '<%= config.bin %> account update --company-name "Acme Inc" --json',
    '<%= config.bin %> account update --settings \'{"calendar":"customFiscal","fiscalYearStart":{"month":4,"day":1}}\'',
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
      description: 'JSON object: {dateFormat, numberFormat, firstDayOfWeek, calendar, fiscalYearStart: {month, day}}',
    }),
    'tax-number': Flags.string({description: 'Tax number'}),
    'website-url': Flags.string({description: 'Website URL'}),
  }

  async run(): Promise<void> {
    // The API rejects a blank name with a 400; catch it before the round trip.
    if (this.flags.name !== undefined && this.flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {}
    if (this.flags.name !== undefined) body.name = this.flags.name
    if (this.flags['company-name'] !== undefined) body.companyName = this.flags['company-name']
    if (this.flags['website-url'] !== undefined) body.websiteUrl = this.flags['website-url']
    if (this.flags['tax-number'] !== undefined) body.taxNumber = this.flags['tax-number']
    if (this.flags['billing-name'] !== undefined) body.billingName = this.flags['billing-name']
    if (this.flags.address !== undefined) body.address = this.parseJsonFlag(this.flags.address, 'address', '{"street":"...","city":"...","country":"..."}')
    if (this.flags.settings !== undefined) body.settings = this.parseJsonFlag(this.flags.settings, 'settings', '{"calendar":"customFiscal","fiscalYearStart":{"month":4,"day":1}}')
    if (this.flags.metadata !== undefined) body.metadata = this.parseJsonFlag(this.flags.metadata, 'metadata', '{"industry":["..."],"companySize":"..."}')

    if (Object.keys(body).length === 0) {
      this.error(
        'Provide at least one field to update (--name, --company-name, --website-url, --tax-number, --billing-name, --address, --settings or --metadata).',
        {exit: 1},
      )
    }

    const response = await this.apiClient.patch<AccountResponse>('/v2/account', body, this.accountHeaders)

    formatSingle(response, this.outputFormat)
  }
}
