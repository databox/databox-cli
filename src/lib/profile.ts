import {OutputFormat, formatSingle} from './output.js'
import {AccountRef, OrganizationRef, ProfileResponse} from './types.js'

/** "Name (id)", degrading when the API could not look the name or the id up. */
function describeRef(ref: AccountRef | OrganizationRef): string {
  if (ref.id === null) return 'unavailable'
  return `${ref.name ?? '(name unavailable)'} (${ref.id})`
}

/**
 * Prints a profile, as `profile info` reads it and `profile update` returns it. JSON and CSV are
 * the response whole; the table spells out the organization and the account instead of printing
 * them as JSON. A null `account` is a user at the organization level; `organization` is always set,
 * but a missing one prints "none" rather than failing. A name or id the API could not resolve is null.
 */
export function printProfile(profile: ProfileResponse, format: OutputFormat): void {
  if (format !== 'table') {
    formatSingle(profile, format)
    return
  }

  const {account, organization, ...rest} = profile
  formatSingle(rest, format)
  console.log(`Organization: ${organization ? describeRef(organization) : 'none'}`)
  console.log(`Account: ${account ? describeRef(account) : 'none (organization level)'}`)
}
