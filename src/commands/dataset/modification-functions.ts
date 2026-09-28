import {BaseCommand} from '../../base-command.js'
import {formatOutput} from '../../lib/output.js'

/** DatasetResponse.cs `ModificationFunctionItem`. */
interface ModificationFunction {
  description: string
  example: null | string
  name: string
  parameters: Array<{description: string; isOptional: boolean; name: string}>
  signature: string
}

export default class DatasetModificationFunctions extends BaseCommand<typeof DatasetModificationFunctions> {
  static description = `List the functions available to modification formulas

--json also includes each function's parameters and an example.`

  static examples = [
    '<%= config.bin %> dataset modification-functions',
    '<%= config.bin %> dataset modification-functions --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get<{items: ModificationFunction[]}>('/v2/datasets/modifications/functions', undefined, this.accountHeaders)

    formatOutput(
      response.items,
      [
        {header: 'Name', key: 'name'},
        {header: 'Signature', key: 'signature'},
        {header: 'Description', key: 'description'},
      ],
      this.outputFormat,
    )
  }
}
