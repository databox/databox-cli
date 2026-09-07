import {expect} from 'chai'

import {
  cli, cliWithRetry, expectExit, expectField, expectKey, expectOk, json, retryRead,
} from './helpers/cli.js'
import {ResourceTracker, createDataSource, e2eName} from './helpers/resources.js'

interface DataSource {
  connectionId: null | number
  id: number
  integrationKey: null | string
  name: string
  timezone: null | string
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

    expect(result.stdout).to.include('ID')
    expect(result.stdout).to.include('Name')
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

  it('lists available sync frequencies', async () => {
    const frequencies = json<Array<{label: string; syncInterval: number}>>(
      await cli(['data-source', 'sync-frequencies', dataSourceId, '--json']),
    )

    expect(frequencies).to.be.an('array').that.is.not.empty
    expectField(frequencies[0], 'syncInterval', 'number')
    expectField(frequencies[0], 'label', 'string')

    // Table mode is a separate path through formatOutput and used to throw here.
    const table = expectOk(await cli(['data-source', 'sync-frequencies', dataSourceId]))
    expect(table.stdout).to.include('Interval (min)')
  })

  it('sets a sync frequency offered by the API', async () => {
    const offered = json<Array<{syncInterval: number}>>(
      await cli(['data-source', 'sync-frequencies', dataSourceId, '--json']),
    )
    const interval = offered.find(f => f.syncInterval === 1440)?.syncInterval ?? offered[0].syncInterval

    const result = expectOk(await cliWithRetry(['data-source', 'set-sync-frequency', dataSourceId, '--interval', String(interval)]))
    expect(result.stdout).to.include(`${interval} minutes`)

    const reread = json<{syncInterval?: number}>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(reread.syncInterval).to.equal(interval)
  })

  it('sets a timezone the account supports', async () => {
    const timezones = json<Array<{timezone: string}>>(await cli(['account', 'timezones', '--json']))
    const {timezone} = timezones[0]

    const result = expectOk(await cliWithRetry(['data-source', 'set-timezone', dataSourceId, '--timezone', timezone]))
    expect(result.stdout).to.include(timezone)

    const reread = json<DataSource>(await cli(['data-source', 'get', dataSourceId, '--json']))
    expect(reread.timezone).to.equal(timezone)
  })

  it('reads permissions', async () => {
    const permissions = json<Record<string, unknown>>(await cli(['data-source', 'permissions', dataSourceId, '--json']))
    expect(permissions).to.be.an('object')
  })

  it('purges the data source', async () => {
    const result = expectOk(await cli(['data-source', 'purge', dataSourceId, '--force']))
    expect(result.stdout).to.include(`${dataSourceId} purged.`)
  })

  it('rejects a non-numeric id with exit 2', async () => {
    const result = await cli(['data-source', 'get', 'not-a-number', '--json'])

    expectExit(result, 2)
    expect(result.stderr).to.include('must be a numeric value')
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
