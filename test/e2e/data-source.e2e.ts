import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, serviceUnavailable, skipWith,
} from './helpers/cli.js'
import {ResourceTracker, createDataSource, e2eName} from './helpers/resources.js'

/** DataSourceResponse.cs `DataSourceDetail`: only what these tests read. */
interface DataSource {
  connectionId: null | number
  id: number
  integrationKey: null | string
  name: string
  syncInterval: null | number
  timezone: null | string
}

/** DataSourceResponse.cs `DataSourcePermissionsResponse`. */
interface Permissions {
  accessLevel: string
  accessList: Array<{id: number; name: string}> | null
}

describe('data-source', () => {
  const tracker = new ResourceTracker()
  let dataSourceId: string
  let dataSourceName: string

  before(async () => {
    const created = await createDataSource(tracker, 'ds')
    dataSourceId = created.id
    dataSourceName = created.name
  })

  after(async () => {
    await tracker.teardown()
  })

  it('returns the created data source by id', async () => {
    const dataSource = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))

    expectField(dataSource, 'id', 'number')
    expect(String(dataSource.id)).to.equal(dataSourceId)
    expectKey(dataSource, 'timezone')
    expectKey(dataSource, 'connectionId')
    for (const key of ['integrationKey', 'createdAt', 'lastActivityAt', 'managedBy', 'syncInterval']) expectKey(dataSource, key)

    // statusInfo is always present, with the same fields a dataset's carries.
    expectField(dataSource, 'statusInfo', 'object')
    const {statusInfo} = dataSource as unknown as {statusInfo: Record<string, unknown>}
    expectField(statusInfo, 'status', 'string')
    for (const key of ['statusCode', 'errorType', 'reason', 'description', 'userAction']) expectKey(statusInfo, key)
  })

  it('carries the name it was created with', async () => {
    const dataSource = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(dataSource.name).to.equal(dataSourceName)
  })

  it('finds the data source in the list', async () => {
    const listed = json<DataSource[]>(
      await cli(['data-source', 'list', '--search', dataSourceName, '--page-size', '50', '--json']),
    )

    expect(listed).to.be.an('array')
    expect(listed.some(item => String(item.id) === dataSourceId)).to.equal(
      true,
      `data source ${dataSourceId} not returned by --search "${dataSourceName}"`,
    )
  })

  it('renders the list as a table with pagination', async () => {
    const result = expectOk(await cli(['data-source', 'list', '--page-size', '5']))

    for (const header of ['ID', 'Name', 'Status', 'Last Activity']) expect(result.stdout).to.include(header)
    expect(result.stdout).to.match(/Page \d+ of \d+/)
  })

  it('updates the name', async () => {
    const renamed = e2eName('ds-renamed')
    expectOk(await cli(['data-source', 'update', dataSourceId, '--name', renamed, '--json']))

    const reread = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(reread.name).to.equal(renamed)

    dataSourceName = renamed
  })

  it('lists its datasets (empty for a fresh data source)', async () => {
    const datasets = json<unknown[]>(await cli(['data-source', 'datasets', dataSourceId, '--json']))
    expect(datasets).to.be.an('array').that.is.empty
  })

  it('lists the sync frequency options', async () => {
    // Unwrapped from {items} to a bare array, like every other list.
    const options = json<Array<{label: string; syncInterval: number}>>(
      await cli(['data-source', 'sync-frequency-options', dataSourceId, '--json']),
    )

    expect(options).to.be.an('array').that.is.not.empty
    expectField(options[0], 'syncInterval', 'number')
    expectField(options[0], 'label', 'string')
    expectField(options[0], 'isDefault', 'boolean')
    expectField(options[0], 'isSelected', 'boolean')
    expectField(options[0], 'availability', 'string')

    // Table mode is a separate path through formatOutput and used to throw here.
    const table = expectOk(await cli(['data-source', 'sync-frequency-options', dataSourceId]))
    expect(table.stdout).to.include('Interval (min)')
    expect(table.stdout).to.include('Availability')
  })

  it('sets a sync frequency offered by the API and returns the updated data source', async () => {
    const offered = json<Array<{syncInterval: number}>>(
      await cli(['data-source', 'sync-frequency-options', dataSourceId, '--json']),
    )
    const interval = offered.find(f => f.syncInterval === 1440)?.syncInterval ?? offered[0].syncInterval

    const result = expectOk(await cliWithRetry(['data-source', 'set-sync-frequency', dataSourceId, '--interval', String(interval)]))
    expect(result.stdout).to.include(`${interval} minutes`)

    const updated = json<DataSource>(
      await cliWithRetry(['data-source', 'set-sync-frequency', dataSourceId, '--interval', String(interval), '--json']),
    )
    expect(String(updated.id)).to.equal(dataSourceId)
    expect(updated.syncInterval).to.equal(interval)

    const reread = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(reread.syncInterval).to.equal(interval)
  })

  it('sets a timezone the account supports and returns the updated data source', async () => {
    const timezones = json<Array<{timezone: string}>>(await cli(['organization', 'timezones', '--json']))
    // Pick a zone the fixture is not already in, so the call has to change something.
    const current = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json'])).timezone
    const {timezone} = timezones.find(zone => zone.timezone !== current) ?? timezones[0]

    const result = expectOk(await cliWithRetry(['data-source', 'set-timezone', dataSourceId, '--timezone', timezone]))
    expect(result.stdout).to.include(timezone)

    const updated = json<DataSource>(
      await cliWithRetry(['data-source', 'set-timezone', dataSourceId, '--timezone', timezone, '--json']),
    )
    expect(String(updated.id)).to.equal(dataSourceId)
    expect(updated.timezone).to.equal(timezone)

    const reread = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(reread.timezone).to.equal(timezone)
  })

  it('reads permissions', async () => {
    const permissions = json<Permissions>(await cli(['data-source', 'permissions', dataSourceId, '--json']))

    expectField(permissions, 'accessLevel', 'string')
    expectKey(permissions, 'accessList')
    if (permissions.accessLevel !== 'selectedUsers') {
      expect(permissions.accessList, 'accessList is null unless accessLevel is selectedUsers').to.equal(null)
    }
  })

  // The fixture is this suite's own, created and deleted here, so it needs no withRestore: the
  // undo log is for resources the suite does not own, and an entry for a deleted fixture could
  // never be replayed. It is still put back, so the tests after this one read the usual state.
  it('round-trips the private access level', async () => {
    const original = json<Permissions>(await cli(['data-source', 'permissions', dataSourceId, '--json']))

    const updated = json<Permissions>(
      await cliWithRetry(['data-source', 'set-permissions', dataSourceId, '--access-level', 'private', '--json']),
    )
    expect(updated.accessLevel).to.equal('private')
    expect(updated.accessList).to.equal(null)

    const reread = json<Permissions>(await cli(['data-source', 'permissions', dataSourceId, '--json']))
    expect(reread.accessLevel).to.equal('private')

    const restoreArgv = ['data-source', 'set-permissions', dataSourceId, '--access-level', original.accessLevel, '--json']
    for (const user of original.accessList ?? []) restoreArgv.push('--access-list', String(user.id))
    const restored = json<Permissions>(await cliWithRetry(restoreArgv))
    expect(restored.accessLevel).to.equal(original.accessLevel)
  })

  it('purges the data source', async () => {
    const result = expectOk(await cli(['data-source', 'purge', dataSourceId, '--force']))
    expect(result.stdout).to.include(`${dataSourceId} purged.`)
  })

  it('rejects a non-numeric id with exit 2', async () => {
    const result = await cli(['data-source', 'get', 'not-a-number', '--json'])

    expectExit(result, 2)
    expect(errorText(result)).to.include('must be a numeric value')
  })

  // The unit harness refuses an empty flag value; the real binary passes it through. An empty
  // --timezone used to be dropped, so the data source took the default zone; now it is sent,
  // and DataSourceService.CreateDataSource rejects it.
  it('sends an empty --timezone for the API to reject', async function () {
    const result = await cliWithRetry(['data-source', 'create', '--name', e2eName('ds-empty-tz'), '--timezone', '', '--json'])
    // A regression creates a data source; tracked, teardown removes it.
    if (result.code === 0) tracker.track('data-source', json<{id: number}>(result).id)

    const outage = serviceUnavailable(result)
    if (outage) skipWith(this, outage)

    expectExit(result, 1)
    expect(errorText(result)).to.match(/invalid timezone/i)
  })

  // The API accepts an empty --integration-key and creates a data source with an empty type,
  // so the CLI refuses it before any request.
  it('rejects an empty --integration-key with exit 2', async () => {
    const result = await cli(['data-source', 'create', '--name', e2eName('ds-empty-key'), '--integration-key', '', '--json'])
    // A regression creates a data source; tracked, teardown removes it.
    if (result.code === 0) tracker.track('data-source', json<{id: number}>(result).id)

    expectExit(result, 2)
    expect(errorText(result)).to.include('--integration-key cannot be empty')
  })

  it('deletes the data source', async () => {
    const result = expectOk(await cli(['data-source', 'delete', dataSourceId, '--force']))
    expect(result.stdout).to.include(`${dataSourceId} deleted.`)

    tracker.forget('data-source', dataSourceId)

    // Both `get` and `list` are served from a cache that keeps returning the
    // deleted record for a short window, so poll rather than read once.
    await retryRead(
      async () => {
        const listed = json<DataSource[]>(
          await cli(['data-source', 'list', '--search', dataSourceName, '--page-size', '50', '--json']),
        )

        if (listed.some(item => String(item.id) === dataSourceId)) {
          throw new Error(`deleted data source ${dataSourceId} is still listed`)
        }
      },
      {attempts: 10, delayMs: 3000},
    )
  })
})
