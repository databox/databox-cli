import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectKey, expectOk, json, serviceUnavailable, skipWith,
} from './helpers/cli.js'

interface ActivityLogEntry {
  action: string
  createdAt: string
  details: Record<string, unknown> | null
  resourceType: null | string
  user: unknown
}

/** Names the API has published the event's space id under. It publishes none of them now. */
const SPACE_ID_KEYS = ['spaceId', 'accountId', 'organizationId']

/** The endpoint is gated on the Advanced Security add-on and admin privileges. */
function featureUnavailable(stderr: string): boolean {
  return /feature_not_available|forbidden|not available|permission/i.test(stderr)
}

describe('activity-log', () => {
  let entries: ActivityLogEntry[] | undefined

  let unavailableReason: string | undefined

  before(async () => {
    const result = await cliWithRetry(['activity-log', 'list', '--page-size', '10', '--json'])

    if (result.code === 0) {
      entries = JSON.parse(result.stdout) as ActivityLogEntry[]
      return
    }

    const outage = serviceUnavailable(result)
    if (outage) {
      unavailableReason = outage
    } else if (featureUnavailable(errorText(result))) {
      unavailableReason = 'organization lacks the Advanced Security add-on or admin rights'
    } else {
      throw new Error(`activity-log list failed unexpectedly: ${errorText(result)}`)
    }
  })

  it('lists activity log entries', function () {
    if (!entries) {
      skipWith(this, `${unavailableReason}`)
    }

    expect(entries).to.be.an('array')
    if (entries!.length > 0) {
      expectKey(entries![0], 'action')
      expectKey(entries![0], 'createdAt')
      expectKey(entries![0], 'resourceType')
    }
  })

  it('renders the log as a table', async function () {
    if (!entries) skipWith(this, `${unavailableReason}`)

    const result = expectOk(await cli(['activity-log', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Action')
  })

  it('filters by resource type', async function () {
    if (!entries) skipWith(this, `${unavailableReason}`)
    if (entries.length === 0) skipWith(this, 'the activity log is empty, so there is no resource type to filter by')

    const resourceType = entries!.find(entry => entry.resourceType)?.resourceType
    if (!resourceType) skipWith(this, 'no entry on the first page has a resource type to filter by')

    const filtered = json<ActivityLogEntry[]>(
      await cli(['activity-log', 'list', '--resource-type', resourceType!, '--page-size', '20', '--json']),
    )

    for (const entry of filtered) {
      expect(entry.resourceType).to.equal(resourceType)
    }
  })

  // Company and space events are published as `administration`, and the space an event happened in
  // is not repeated in `details`: it is always the scope of the request.
  it('labels administration events, without the space id in details', async function () {
    if (!entries) skipWith(this, `${unavailableReason}`)

    const administrationEntries = json<ActivityLogEntry[]>(
      await cli(['activity-log', 'list', '--resource-type', 'administration', '--page-size', '25', '--json']),
    )

    for (const entry of [...entries!, ...administrationEntries]) {
      for (const key of SPACE_ID_KEYS) {
        expect(entry.details ?? {}, `details of "${entry.action}"`).to.not.have.property(key)
      }
    }

    for (const entry of administrationEntries) {
      expect(entry.resourceType).to.equal('administration')
    }

    if (administrationEntries.length === 0) {
      console.log('   note: no administration events in the log, so only the first page was checked for space ids')
    }
  })
})
