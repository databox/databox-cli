import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectOk, json, retryRead, skipWith,
} from './helpers/cli.js'
import {ResourceTracker, e2eName} from './helpers/resources.js'

interface Client {
  id: number
  name: string
}

describe('client', () => {
  const tracker = new ResourceTracker()
  let isAgency = false
  let createdId: string | undefined

  before(async () => {
    // Only agency accounts have clients; a non-agency account rejects the endpoint.
    const probe = await cliWithRetry(['client', 'list', '--page-size', '5', '--json'])
    isAgency = probe.code === 0
    if (!isAgency) {
      console.log(`   note: account is not an agency (client list exited ${probe.code})`)
    }
  })

  after(async function () {
    this.timeout(120_000)
    await tracker.teardown()
  })

  it('lists client accounts', async function () {
    if (!isAgency) skipWith(this, 'account is not an agency')

    const clients = json<Client[]>(await cli(['client', 'list', '--page-size', '5', '--json']))
    expect(clients).to.be.an('array')
    if (clients.length > 0) expectField(clients[0], 'id', 'number')
  })

  it('creates a client account', async function () {
    if (!isAgency) skipWith(this, 'account is not an agency')

    const name = e2eName('client')
    const created = json<Client>(await cli(['client', 'create', '--name', name, '--json']))

    expectField(created, 'id', 'number')
    createdId = tracker.track('client', created.id)
  })

  it('returns the client by id', async function () {
    if (!createdId) skipWith(this, 'no client account was created')

    const client = json<Client>(await cli(['client', 'get', createdId!, '--json']))
    expect(String(client.id)).to.equal(createdId)
  })

  it('updates the client name', async function () {
    if (!createdId) skipWith(this, 'no client account was created')

    const renamed = e2eName('client-renamed')
    expectOk(await cli(['client', 'update', createdId!, '--name', renamed, '--json']))

    const reread = json<Client>(await cli(['client', 'get', createdId!, '--json']))
    expect(reread.name).to.equal(renamed)
  })

  it('deletes the client account, after which get answers not found', async function () {
    this.timeout(120_000)
    if (!createdId) skipWith(this, 'no client account was created')

    expectOk(await cli(['client', 'delete', createdId!, '--force']))
    tracker.forget('client', createdId!)

    // Polled, in case the read is served from a cache for a moment after the delete.
    await retryRead(
      async () => {
        const result = await cli(['client', 'get', createdId!])
        if (result.code === 0) throw new Error(`deleted client ${createdId} is still returned`)

        expectExit(result, 1)
        expect(errorText(result)).to.match(/not_found/)
        expect(errorText(result)).to.include(`Client with id ${createdId} not found`)
      },
      {attempts: 6, delayMs: 3000},
    )
  })
})
