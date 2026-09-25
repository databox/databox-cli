import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {printProfile} from '../../lib/profile.js'
import {ProfileResponse} from '../../lib/types.js'

export default class ProfileUpdate extends BaseCommand<typeof ProfileUpdate> {
  static description = `Update your profile

--metadata takes {department, title, role}. department and role must be values from "profile metadata-options", and a role must belong to the department; title is free text. A field left out keeps its value, and "" clears it. Clearing department requires clearing role in the same call: {"department":"","role":""}.`

  static examples = [
    '<%= config.bin %> profile update --name "New Name"',
    '<%= config.bin %> profile update --timezone "US/Eastern"',
    '<%= config.bin %> profile update --name "New Name" --timezone "UTC" --json',
    '<%= config.bin %> profile update --metadata \'{"department":"engineering","role":"software_engineer"}\'',
    '<%= config.bin %> profile update --metadata \'{"department":"","role":""}\'',
  ]

  static flags = {
    metadata: Flags.string({description: 'JSON object: {department, title, role}; "" clears a field'}),
    name: Flags.string({description: 'New display name'}),
    timezone: Flags.string({description: 'New timezone'}),
  }

  async run(): Promise<void> {
    // The API rejects a blank name with a 400; catch it before the round trip.
    if (this.flags.name !== undefined && this.flags.name.trim() === '') {
      this.error('--name cannot be empty.', {exit: 2})
    }

    const body: Record<string, unknown> = {}
    if (this.flags.name !== undefined) body.name = this.flags.name
    if (this.flags.timezone !== undefined) body.timezone = this.flags.timezone
    if (this.flags.metadata !== undefined) {
      body.metadata = this.parseJsonFlag(this.flags.metadata, 'metadata', '{"department":"...","title":"...","role":"..."}')
    }

    if (Object.keys(body).length === 0) {
      this.error('Provide at least one field to update (--name, --timezone or --metadata).', {exit: 1})
    }

    const response = await this.apiClient.patch<ProfileResponse>('/v2/profile', body, this.accountHeaders)

    printProfile(response, this.outputFormat)
  }
}
