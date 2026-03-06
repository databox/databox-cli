import {BaseCommand} from '../../base-command.js'

export default class Validate extends BaseCommand<typeof Validate> {
  static description = 'Validate the currently stored API key'

  async run(): Promise<void> {
    try {
      const response = await this.apiClient.get('/v1/auth/validate-key')

      if (this.flags.json) {
        this.log(JSON.stringify(response, null, 2))
      } else {
        this.log('API key is valid.')
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(error.message, {exit: 1})
      }

      throw error
    }
  }
}
