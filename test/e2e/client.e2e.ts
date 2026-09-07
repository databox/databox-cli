import {expect} from 'chai'

import {cli, cliWithRetry, expectField, expectOk, json} from './helpers/cli.js'
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
    if (!isAgency) this.skip()

    const clients = json<Client[]>(await cli(['client', 'list', '--page-size', '5', '--json']))
    expect(clients).to.be.an('array')
    if (clients.length > 0) expectField(clients[0], 'id', 'number')
  })

  it('creates a client account', async function () {
    if (!isAgency) this.skip()

    const name = e2eName('client')
    const created = json<Client>(await cli(['client', 'create', '--name', name, '--json']))

    expectField(created, 'id', 'number')
    createdId = tracker.track('client', created.id)
  })

  it('returns the client by id', async function () {
    if (!createdId) this.skip()

    const client = json<Client>(await cli(['client', 'get', createdId!, '--json']))
    expect(String(client.id)).to.equal(createdId)
  })

  it('updates the client name', async function () {
    if (!createdId) this.skip()

    const renamed = e2eName('client-renamed')
    expectOk(await cli(['client', 'update', createdId!, '--name', renamed, '--json']))

    const reread = json<Client>(await cli(['client', 'get', createdId!, '--json']))
    expect(reread.name).to.equal(renamed)
  })

  it('deletes the client account', async function () {
    if (!createdId) this.skip()

    expectOk(await cli(['client', 'delete', createdId!, '--force']))
    tracker.forget('client', createdId!)
  })
})
