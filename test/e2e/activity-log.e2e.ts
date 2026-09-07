import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectKey, expectOk, json, serviceUnavailable,
} from './helpers/cli.js'

interface ActivityLogEntry {
  action: string
  createdAt: string
  resourceType: null | string
  user: unknown
}

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
      unavailableReason = 'account lacks the Advanced Security add-on or admin rights'
    } else {
      throw new Error(`activity-log list failed unexpectedly: ${errorText(result)}`)
    }
  })

  it('lists activity log entries', function () {
    if (!entries) {
      console.log(`   skip: ${unavailableReason}`)
      this.skip()
    }

    expect(entries).to.be.an('array')
    if (entries!.length > 0) {
      expectKey(entries![0], 'action')
      expectKey(entries![0], 'createdAt')
      expectKey(entries![0], 'resourceType')
    }
  })

  it('renders the log as a table', async function () {
    if (!entries) this.skip()

    const result = expectOk(await cli(['activity-log', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Action')
  })

  it('filters by resource type', async function () {
    if (!entries || entries.length === 0) this.skip()

    const resourceType = entries!.find(entry => entry.resourceType)?.resourceType
    if (!resourceType) this.skip()

    const filtered = json<ActivityLogEntry[]>(
      await cli(['activity-log', 'list', '--resource-type', resourceType!, '--page-size', '20', '--json']),
    )

    for (const entry of filtered) {
      expect(entry.resourceType).to.equal(resourceType)
    }
  })
})
