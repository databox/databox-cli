import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

interface AccountResponse {
  accountType: string
  companyName: string | null
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
    'company-name': Flags.string({description: 'Company name'}),
    name: Flags.string({description: 'Account name'}),
  }

  async run(): Promise<void> {
    const body: Record<string, unknown> = {}
    if (this.flags.name) body.name = this.flags.name
    if (this.flags['company-name']) body.companyName = this.flags['company-name']

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name or --company-name).', {exit: 1})
    }

    const response = await this.apiClient.patch<AccountResponse>('/v2/account', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
