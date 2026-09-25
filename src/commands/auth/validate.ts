import {BaseCommand} from '../../base-command.js'

export default class Validate extends BaseCommand<typeof Validate> {
  static description = 'Validate the currently stored API key'

  static examples = [
    '<%= config.bin %> auth validate',
    '<%= config.bin %> auth validate --json',
  ]

  async run(): Promise<void> {
    const response = await this.apiClient.get('/v2/auth/validate-key', undefined, this.accountHeaders)

    if (this.outputFormat === 'json') {
      this.log(JSON.stringify(response, null, 2))
    } else {
      this.log('API key is valid.')
    }
  }
}
