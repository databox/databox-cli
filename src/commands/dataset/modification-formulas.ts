import {BaseCommand} from '../../base-command.js'
import {formatSingle} from '../../lib/output.js'

export default class DatasetModificationFormulas extends BaseCommand<typeof DatasetModificationFormulas> {
  static description = 'List available modification formulas'

  static examples = [
    '<%= config.bin %> dataset modification-formulas',
    '<%= config.bin %> dataset modification-formulas --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<Record<string, unknown>>('/v2/datasets/modifications/formulas')

    formatSingle(response, this.flags.json)
  }
}
