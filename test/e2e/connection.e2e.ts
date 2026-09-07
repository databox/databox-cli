import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectOk, json,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

interface Connection {
  id: number
  name: null | string
}

/**
 * Connections are created by authorizing a third-party integration, which the CLI
 * cannot do — so this suite only reads, and updates a name in place and restores it.
 * `connection delete` is deliberately not exercised: it would destroy a real
 * integration hookup the suite did not create.
 */
describe('connection', () => {
  let connections: Connection[]

  before(async () => {
    connections = json<Connection[]>(await cliWithRetry(['connection', 'list', '--page-size', '20', '--json']))
  })

  it('lists connections', function () {
    if (connections.length === 0) {
      console.log('   skip: account has no connections')
      this.skip()
    }

    expectField(connections[0], 'id', 'number')
  })

  it('renders the list as a table', async function () {
    if (connections.length === 0) this.skip()

    const result = expectOk(await cli(['connection', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('ID')
  })

  it('returns a connection by id', async function () {
    if (connections.length === 0) this.skip()

    const connection = json<Connection>(await cli(['connection', 'get', String(connections[0].id), '--json']))
    expect(String(connection.id)).to.equal(String(connections[0].id))
  })

  it('reads connection permissions', async function () {
    if (connections.length === 0) this.skip()

    const permissions = json<Record<string, unknown>>(
      await cli(['connection', 'permissions', String(connections[0].id), '--json']),
    )
    expect(permissions).to.be.an('object')
  })

  it('updates a connection name and restores it', async function () {
    if (connections.length === 0) this.skip()

    const {id} = connections[0]
    const original = connections[0].name ?? ''
    const renamed = `${original} (e2e)`

    await withRestore(
      `connection.${id}.name`,
      ['connection', 'update', String(id), '--name', original, '--json'],
      async () => {
        expectOk(await cli(['connection', 'update', String(id), '--name', renamed, '--json']))

        const reread = json<Connection>(await cli(['connection', 'get', String(id), '--json']))
        expect(reread.name).to.equal(renamed)
      },
    )
  })
})
