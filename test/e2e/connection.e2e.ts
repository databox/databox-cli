import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectKey, expectOk, json, skipWith,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

interface Connection {
  id: number
  name: null | string
}

/** ConnectionResponse.cs `ConnectionPermissions`. */
interface Permissions {
  accessLevel: string
  accessList: Array<{id: number; name: string}> | null
  sharedWithClients: boolean
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
      skipWith(this, 'account has no connections')
    }

    expectField(connections[0], 'id', 'number')
  })

  it('renders the list as a table', async function () {
    if (connections.length === 0) skipWith(this, 'account has no connections')

    const result = expectOk(await cli(['connection', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('ID')
  })

  it('returns a connection by id', async function () {
    if (connections.length === 0) skipWith(this, 'account has no connections')

    const connection = json<Connection & Permissions>(await cli(['connection', 'get', String(connections[0].id), '--json']))
    expect(String(connection.id)).to.equal(String(connections[0].id))

    // The detail carries the same access fields: accessList is null unless selectedUsers.
    expectField(connection, 'accessLevel', 'string')
    expectKey(connection, 'accessList')
    if (connection.accessLevel !== 'selectedUsers') {
      expect(connection.accessList, 'accessList is null unless accessLevel is selectedUsers').to.equal(null)
    }
  })

  it('reads connection permissions', async function () {
    if (connections.length === 0) skipWith(this, 'account has no connections')

    const permissions = json<Permissions>(
      await cli(['connection', 'permissions', String(connections[0].id), '--json']),
    )

    expectField(permissions, 'accessLevel', 'string')
    expectField(permissions, 'sharedWithClients', 'boolean')
    expectKey(permissions, 'accessList')
    if (permissions.accessLevel === 'selectedUsers') {
      expect(permissions.accessList).to.be.an('array')
    } else {
      expect(permissions.accessList, 'accessList is null unless accessLevel is selectedUsers').to.equal(null)
    }
  })

  it('updates a connection name and restores it', async function () {
    if (connections.length === 0) skipWith(this, 'account has no connections')

    const {id} = connections[0]
    const original = connections[0].name ?? ''

    // Both the CLI and the API refuse a blank name, so a blank original could never be put back.
    if (original.trim() === '') {
      skipWith(this, `connection ${id}: original name is blank and cannot be restored through the API`)
    }

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
