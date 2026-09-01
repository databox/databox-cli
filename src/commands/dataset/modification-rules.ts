import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetModificationRules extends BaseCommand<typeof DatasetModificationRules> {
  static description = 'List available modification rules'

  static examples = [
    '<%= config.bin %> dataset modification-rules',
    '<%= config.bin %> dataset modification-rules --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<Record<string, unknown>>('/v2/datasets/modifications/rules')

    formatSingle(response, this.flags.json)
  }
}
