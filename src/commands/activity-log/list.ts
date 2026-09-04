import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface ActivityLogEntry {
  action: string
  id: number
  resourceId: string
  resourceType: string
  timestamp: string
  userName: string
}

interface ActivityLogResponse {
  items: ActivityLogEntry[]
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
  }
}

export default class ActivityLogList extends BaseCommand<typeof ActivityLogList> {
  static description = 'List activity log entries'

  static examples = [
    '<%= config.bin %> activity-log list',
    '<%= config.bin %> activity-log list --resource-type data_source',
    '<%= config.bin %> activity-log list --user-id 123',
    '<%= config.bin %> activity-log list --json',
  ]

  static flags = {
    page: Flags.integer({description: 'Page number'}),
    'page-size': Flags.integer({description: 'Number of items per page'}),
    'resource-type': Flags.string({description: 'Filter by resource type'}),
    'user-id': Flags.string({description: 'Filter by user ID'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags['resource-type']) query.resourceType = this.flags['resource-type']
    if (this.flags['user-id']) query.userId = this.flags['user-id']
    if (this.flags.page !== undefined) query.page = this.flags.page
    if (this.flags['page-size'] !== undefined) query.pageSize = this.flags['page-size']

    const response = await this.apiClient.get<ActivityLogResponse>(
      '/v2/account/activity-log',
      Object.keys(query).length > 0 ? query : undefined,
      this.accountHeaders,
    )

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Action', key: 'action'},
        {header: 'Resource Type', key: 'resourceType'},
        {header: 'Resource ID', key: 'resourceId'},
        {header: 'Timestamp', key: 'timestamp'},
        {header: 'User', key: 'userName'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
