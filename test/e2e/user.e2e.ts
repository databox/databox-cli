import {expect} from 'chai'

import {cli, expectField, expectOk, json, retryRead, serviceUnavailable} from './helpers/cli.js'
import {E2E_PREFIX, ResourceTracker} from './helpers/resources.js'

interface User {
  email: string
  id: number
  name: string
  role?: string
}

const E2E_EMAIL_PATTERN = new RegExp(`^${E2E_PREFIX}[\\w-]+@databox\\.com$`)

describe('user', () => {
  const tracker = new ResourceTracker()
  let users: User[]
  let invitedId: string | undefined

  before(async function () {
    this.timeout(120_000)

    users = json<User[]>(await cli(['user', 'list', '--page-size', '100', '--json']))

    // Sweep invites left by a previous interrupted run before adding another.
    for (const orphan of users.filter((user) => E2E_EMAIL_PATTERN.test(user.email ?? ''))) {
      // eslint-disable-next-line no-await-in-loop
      const removed = await cli(['user', 'delete', String(orphan.id), '--force'])
      console.log(
        removed.code === 0
          ? `   pre-sweep: removed orphaned invite ${orphan.email}`
          : `   pre-sweep: could not remove ${orphan.email} (exit ${removed.code})`,
      )
    }
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists users', () => {
    expect(users).to.be.an('array').that.is.not.empty
    expectField(users[0], 'id', 'number')
    expectField(users[0], 'email', 'string')
  })

  it('renders the list as a table', async () => {
    const result = expectOk(await cli(['user', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Email')
  })

  it('returns a user by id', async () => {
    const user = json<User>(await cli(['user', 'get', String(users[0].id), '--json']))

    expectField(user, 'id', 'number')
    expect(String(user.id)).to.equal(String(users[0].id))
  })

  it('rejects an invalid role', async () => {
    const result = await cli(['user', 'invite', '--email', 'someone@databox.com', '--role', 'superadmin'])

    expect(result.code).to.not.equal(0)
    expect(result.stderr).to.include('role')
  })

  it('invites a user', async function () {
    const email = `${E2E_PREFIX}${Date.now()}@databox.com`

    // Not retried: a create that succeeded server-side would come back as a
    // duplicate-email error on the second attempt. A service outage skips instead.
    const result = await cli(['user', 'invite', '--email', email, '--role', 'user', '--json'])

    const outage = serviceUnavailable(result)
    if (outage) {
      console.log(`   skip: ${outage}`)
      this.skip()
    }

    const invited = json<{id: number}>(result)
    expectField(invited, 'id', 'number')
    invitedId = tracker.track('user', invited.id)
  })

  it('finds the invited user in the list', async function () {
    this.timeout(120_000)
    if (!invitedId) this.skip()

    await retryRead(
      async () => {
        const listed = json<User[]>(await cli(['user', 'list', '--page-size', '100', '--json']))
        if (!listed.some((user) => String(user.id) === invitedId)) {
          throw new Error(`invited user ${invitedId} not listed yet`)
        }
      },
      {attempts: 6, delayMs: 3000},
    )
  })

  it('updates the invited user role', async function () {
    if (!invitedId) this.skip()

    expectOk(await cli(['user', 'update', invitedId!, '--role', 'admin', '--json']))
  })

  it('removes the invited user', async function () {
    if (!invitedId) this.skip()

    const result = expectOk(await cli(['user', 'delete', invitedId!, '--force']))
    expect(result.stdout).to.match(/removed|deleted/i)

    tracker.forget('user', invitedId!)
  })
})
