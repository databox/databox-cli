import {Flags} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {fetchPaginated, paginationFlags} from '../../lib/flags.js'
import {formatOutput, showPagination} from '../../lib/output.js'
import {UserRef} from '../../lib/types.js'

/**
 * ActivityLogResponse.cs `ActivityLogEntry`. `details` is the event's own JSON payload, passed
 * through from the tracking service without the space id, which is always the request's own scope.
 * Its shape varies by event, and it can be null.
 */
interface ActivityLogEntry {
  action: string
  createdAt: string
  details: unknown
  id: number
  isSystem: boolean
  resourceId: null | string
  resourceType: null | string
  user: UserRef | null
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
    '<%= config.bin %> activity-log list --resource-type dataSource',
    '<%= config.bin %> activity-log list --user-id 123',
    '<%= config.bin %> activity-log list --json',
  ]

  static flags = {
    ...paginationFlags,
    'date-from': Flags.string({description: 'Only entries on or after this date (ISO 8601)'}),
    'date-to': Flags.string({
      description: 'Only entries up to this date (ISO 8601). A bare date means the start of that day, UTC: '
        + 'to include all of it, pass the next day',
    }),
    'resource-type': Flags.string({
      description: 'Filter by resource type',
      options: ['dataSource', 'dataset', 'metric', 'user', 'administration', 'billing', 'connection'],
    }),
    search: Flags.string({description: 'Search the log text'}),
    'user-id': Flags.integer({description: 'Filter by the ID of the user who acted'}),
  }

  async run(): Promise<void> {
    const query: Record<string, number | string | undefined> = {}
    if (this.flags['resource-type']) query.resourceType = this.flags['resource-type']
    if (this.flags['user-id'] !== undefined) query.userId = this.flags['user-id']
    if (this.flags.search) query.search = this.flags.search
    if (this.flags['date-from']) query.dateFrom = this.flags['date-from']
    if (this.flags['date-to']) query.dateTo = this.flags['date-to']

    const response = await fetchPaginated(this.flags, query, pageQuery =>
      this.apiClient.get<ActivityLogResponse>('/v2/organization/activity-log', pageQuery, this.accountHeaders), warning => this.warn(warning))

    formatOutput(
      response.items,
      [
        {header: 'ID', key: 'id'},
        {header: 'Action', key: 'action'},
        {header: 'Resource Type', key: 'resourceType'},
        {header: 'Resource ID', key: 'resourceId'},
        {header: 'Created At', key: 'createdAt'},
        {get: row => (row.isSystem ? 'system' : (row.user?.name ?? '')), header: 'User'},
      ],
      this.outputFormat,
    )

    showPagination(response.pagination, this.outputFormat)
  }
}
