import {expect} from 'chai'

import {
  NO_MANAGED_ACCOUNTS, cli, cliWithRetry, errorText, expectExit, expectField, expectOk, json, retryRead,
  serviceUnavailable, skipWith,
} from './helpers/cli.js'
import {ResourceTracker, e2eName} from './helpers/resources.js'

/** ClientResponse.cs `ClientDetail`, published as `AccountDetail`: only what these tests read. */
interface Account {
  id: number
  name: string
}

describe('account', () => {
  const tracker = new ResourceTracker()
  let managesAccounts = false
  let unavailableReason: string | undefined
  let createdId: string | undefined

  before(async () => {
    // Only an organization that manages accounts (an agency) has them; any other is refused with
    // NO_MANAGED_ACCOUNTS. Any other failure is the CLI's or the environment's, never a skip.
    const probe = await cliWithRetry(['account', 'list', '--page-size', '5', '--json'])
    if (probe.code === 0) {
      managesAccounts = true
      return
    }

    const outage = serviceUnavailable(probe)
    if (outage) {
      unavailableReason = outage
    } else if (NO_MANAGED_ACCOUNTS.test(errorText(probe))) {
      unavailableReason = 'organization does not manage accounts'
    } else {
      throw new Error(`account list failed unexpectedly: ${errorText(probe)}`)
    }
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists accounts', async function () {
    if (!managesAccounts) skipWith(this, `${unavailableReason}`)

    const accounts = json<Account[]>(await cli(['account', 'list', '--page-size', '5', '--json']))
    expect(accounts).to.be.an('array')
    if (accounts.length > 0) expectField(accounts[0], 'id', 'number')
  })

  it('creates an account', async function () {
    if (!managesAccounts) skipWith(this, `${unavailableReason}`)

    const name = e2eName('account')
    const created = json<Account>(await cli(['account', 'create', '--name', name, '--json']))

    expectField(created, 'id', 'number')
    createdId = tracker.track('account', created.id)
  })

  it('returns the account by id', async function () {
    if (!createdId) skipWith(this, 'no account was created')

    const account = json<Account>(await cli(['account', 'get', createdId!, '--json']))
    expect(String(account.id)).to.equal(createdId)
  })

  it('updates the account name', async function () {
    if (!createdId) skipWith(this, 'no account was created')

    const renamed = e2eName('account-renamed')
    expectOk(await cli(['account', 'update', createdId!, '--name', renamed, '--json']))

    const reread = json<Account>(await cli(['account', 'get', createdId!, '--json']))
    expect(reread.name).to.equal(renamed)
  })

  it('deletes the account, after which get answers not found', async function () {
    this.timeout(120_000)
    if (!createdId) skipWith(this, 'no account was created')

    const deleted = expectOk(await cli(['account', 'delete', createdId!, '--force']))
    expect(deleted.stdout).to.include(`Account ${createdId} deleted.`)
    tracker.forget('account', createdId!)

    // Polled, in case the read is served from a cache for a moment after the delete.
    await retryRead(
      async () => {
        const result = await cli(['account', 'get', createdId!])
        if (result.code === 0) throw new Error(`deleted account ${createdId} is still returned`)

        expectExit(result, 1)
        expect(errorText(result)).to.match(/not_found/)
        expect(errorText(result)).to.include(`Account with id ${createdId} not found`)
      },
      {attempts: 6, delayMs: 3000},
    )
  })
})
