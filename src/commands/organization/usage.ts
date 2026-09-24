import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

/** Common.cs `UsageBucket`. A null limit means unlimited. */
interface UsageBucket {
  count: number
  limit: null | number
}

/** Common.cs `AiCreditsUsage`: the current credit window. */
interface AiCreditsUsage {
  /** Null when unlimited. */
  limit: null | number
  /** Never below zero; null when unlimited or unknown. */
  remaining: null | number
  resetsAt: null | string
  /** ok, low, exhausted or unknown. */
  state: string
  /** Null when the usage could not be read, which is not the same as zero. */
  used: null | number
}

/**
 * AccountResponse.cs `AccountUsageResponse`, published as `OrganizationUsageResponse`. `aiCredits`
 * is null when the credits read failed.
 */
interface OrganizationUsageResponse {
  accounts: UsageBucket
  aiCredits: AiCreditsUsage | null
  dataSources: UsageBucket
  users: UsageBucket
}

function bucketLine(label: string, bucket: UsageBucket): string {
  return `${label}: ${bucket.count} of ${bucket.limit ?? 'unlimited'}`
}

function aiCreditLines(credits: AiCreditsUsage | null): string[] {
  if (!credits) return ['AI credits: unavailable (the usage could not be read)']

  return [
    `AI credits used: ${credits.used ?? 'unknown'}`,
    `AI credits limit: ${credits.limit ?? 'unlimited'}`,
    `AI credits remaining: ${credits.remaining ?? (credits.limit === null ? 'unlimited' : 'unknown')}`,
    `AI credits state: ${credits.state}`,
    `AI credits reset at: ${credits.resetsAt ?? 'N/A'}`,
  ]
}

export default class OrganizationUsage extends BaseCommand<typeof OrganizationUsage> {
  static description = 'Show organization usage statistics'

  static examples = [
    '<%= config.bin %> organization usage',
    '<%= config.bin %> organization usage --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<OrganizationUsageResponse>('/v2/organization/usage', undefined, this.accountHeaders)

    if (this.outputFormat !== 'table') {
      formatSingle(response, this.outputFormat)
      return
    }

    // One readable line per figure, rather than formatSingle's JSON-encoded nested objects.
    const lines = [
      bucketLine('Users', response.users),
      bucketLine('Data sources', response.dataSources),
      bucketLine('Accounts', response.accounts),
      ...aiCreditLines(response.aiCredits),
    ]
    for (const line of lines) this.log(line)
  }
}
