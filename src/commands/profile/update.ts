import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class ProfileUpdate extends BaseCommand<typeof ProfileUpdate> {
  static description = 'Update your profile'

  static examples = [
    '<%= config.bin %> profile update --name "New Name"',
    '<%= config.bin %> profile update --timezone "US/Eastern"',
    '<%= config.bin %> profile update --name "New Name" --timezone "UTC" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New display name'}),
    timezone: Flags.string({description: 'New timezone'}),
  }

  async run(): Promise<void> {
    const body: Record<string, unknown> = {}
    if (this.flags.name) body.name = this.flags.name
    if (this.flags.timezone) body.timezone = this.flags.timezone

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name or --timezone).', {exit: 1})
    }

    const response = await this.apiClient.patch('/v2/profile', body, this.accountHeaders)

    formatSingle(response, this.flags.json)
  }
}
