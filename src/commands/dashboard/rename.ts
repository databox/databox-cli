import {Args, Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'
import {DataboardListItem} from '../../lib/types.js'

export default class DashboardRename extends BaseCommand<typeof DashboardRename> {
  static args = {
    dashboardId: Args.string({description: 'The dashboard ID to rename', required: true}),
  }

  static description = `Rename a dashboard

The API trims the name and refuses one that is blank, longer than 65 characters, or holds a control character such as a tab or line break. An Admin or Editor can rename any dashboard they can see, a User only one they created. Prints the renamed dashboard as "dashboard list" shows it.`

  static examples = [
    '<%= config.bin %> dashboard rename 12345 --name "Q4 pipeline"',
    '<%= config.bin %> dashboard rename 12345 --name "Q4 pipeline" --json',
  ]

  static flags = {
    name: Flags.string({description: 'New name for the dashboard', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DashboardRename)
    this.requireNumericId(args.dashboardId, 'Dashboard ID')

    // DataboardRequests.cs RenameDashboardRequest. The API validates the name, so it is sent as given.
    const response = await this.apiClient.patch<DataboardListItem>(
      `/v2/dashboards/${args.dashboardId}`,
      {name: flags.name},
      this.accountHeaders,
    )

    formatSingle(response, this.outputFormat)
  }
}
