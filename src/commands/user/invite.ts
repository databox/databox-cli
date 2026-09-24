import {Errors, Flags, Interfaces} from '@oclif/core'

import {BaseCommand} from '../../base-command.js'
import {ApiRequestError, describeApiError} from '../../lib/api-client.js'
import {idempotencyFlags, idempotencyHeaders} from '../../lib/flags.js'
import {formatSingle} from '../../lib/output.js'
import {UserListItem} from '../../lib/types.js'

export default class UserInvite extends BaseCommand<typeof UserInvite> {
  static description = `Invite a user to the organization

An email already in the organization, invited or active, is refused with duplicate_record; change that user with "user update" instead.`

  static examples = [
    '<%= config.bin %> user invite --email user@example.com --role user',
    '<%= config.bin %> user invite --email admin@example.com --role admin --json',
  ]

  static flags = {
    email: Flags.string({description: 'Email address of the user to invite', required: true}),
    ...idempotencyFlags,
    name: Flags.string({description: 'Display name for the new user'}),
    role: Flags.string({description: 'Role for the new user', options: ['admin', 'user', 'editor', 'viewer'], required: true}),
  }

  /**
   * A duplicate email gets a pointer to the command that does what the user most likely wanted.
   * The API error is still rendered by describeApiError, exactly as BaseCommand would, and the
   * exit code stays 1; only a hint line is appended.
   */
  protected async catch(error: Interfaces.CommandError): Promise<unknown> {
    if (error instanceof ApiRequestError && error.code === 'duplicate_record') {
      return super.catch(new Errors.CLIError(
        `${describeApiError(error)}\n  Hint: to change an existing user's role or name, run "user update <userId>" (find the ID with "user list --search <email>").`,
        {exit: 1},
      ))
    }

    return super.catch(error)
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UserInvite)

    const body: Record<string, unknown> = {email: flags.email, role: flags.role}
    if (flags.name !== undefined) body.name = flags.name

    const response = await this.apiClient.post<UserListItem>('/v2/users', body, {...this.accountHeaders, ...idempotencyHeaders(this.flags)})

    formatSingle(response, this.outputFormat)
  }
}
