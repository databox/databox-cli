import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {addPagination, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'

interface ActivityLogEntry {
  action: string
  createdAt: string
  id: number
  isSystem: boolean
  resourceId: string | null
  resourceType: string | null
  user: {id: number; name: string} | null
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
    ...paginationFlags,
    'date-from': Flags.string({description: 'Only entries on or after this date (ISO 8601)'}),
    'date-to': Flags.string({description: 'Only entries on or before this date (ISO 8601)'}),
    'resource-type': Flags.string({description: 'Filter by resource type'}),
    search: Flags.string({description: 'Search the log text'}),
    'user-id': Flags.string({description: 'Filter by user ID'}),
  }

  async run(): Promise<void> {
    const query: Record<string, string | number | undefined> = {}
    if (this.flags['resource-type']) query.resourceType = this.flags['resource-type']
    if (this.flags['user-id']) query.userId = this.flags['user-id']
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['date-from']) query.dateFrom = this.flags['date-from']
    if (this.flags['date-to']) query.dateTo = this.flags['date-to']
    addPagination(query, this.flags)

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
        {header: 'Created At', key: 'createdAt'},
        {get: (row) => (row.isSystem ? 'system' : (row.user?.name ?? '')), header: 'User'},
      ],
      this.flags.json,
    )

    showPagination(response.pagination, this.flags.json)
  }
}
