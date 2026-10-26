import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, retryRead, skipWith,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

/** DataboardResponse.cs `DataboardListItem`, which the rename returns too. */
interface Dashboard {
  id: number
  integrationKeys: string[]
  name: string
  tags: string[]
}

/** DataboardResponse.cs `DataboardDatablockMetric`: only what these tests read. */
interface DatablockMetric {
  dateRange: Record<string, unknown>
  dimensions: Array<Record<string, unknown>>
}

/** DataboardResponse.cs `DataboardMetricsResponse`. */
interface DashboardMetrics {
  datablocks: Array<{metrics: DatablockMetric[]}>
}

/** DataboardRequests.cs RenameDashboardRequest: 1 to 65 characters once trimmed. */
const MAX_NAME_LENGTH = 65
const SUFFIX = ' (e2e)'

function nameOf(dashboards: Dashboard[], id: number): string | undefined {
  return dashboards.find(dashboard => dashboard.id === id)?.name
}

describe('dashboard', () => {
  let dashboards: Dashboard[]

  before(async () => {
    dashboards = json<Dashboard[]>(await cliWithRetry(['dashboard', 'list', '--page-size', '10', '--json']))
  })

  it('lists dashboards', function () {
    if (dashboards.length === 0) skipWith(this, 'account has no dashboards')

    expectField(dashboards[0], 'id', 'number')
    expectField(dashboards[0], 'name', 'string')
    expect(dashboards[0].tags).to.be.an('array')
    expect(dashboards[0].integrationKeys).to.be.an('array')
  })

  it('renders the list as a table', async function () {
    if (dashboards.length === 0) skipWith(this, 'account has no dashboards')

    const result = expectOk(await cli(['dashboard', 'list', '--page-size', '5']))
    for (const header of ['Name', 'Tags', 'Integrations']) expect(result.stdout).to.include(header)
  })

  it('returns the metrics on a dashboard, as the whole response', async function () {
    if (dashboards.length === 0) skipWith(this, 'account has no dashboards')

    const response = json<DashboardMetrics>(await cli(['dashboard', 'metrics', String(dashboards[0].id), '--json']))
    expect(response.datablocks).to.be.an('array')

    for (const datablock of response.datablocks) {
      expectField(datablock, 'id', 'number')
      expectField(datablock, 'name', 'string')
      expectKey(datablock, 'visualizationType')
      expect(datablock.metrics).to.be.an('array')

      for (const metric of datablock.metrics) {
        expectField(metric, 'id', 'string')
        expectField(metric, 'name', 'string')
        expectField(metric, 'sourceId', 'number')
        expectField(metric, 'sourceName', 'string')
        expectKey(metric, 'appliedFilters')
        expect(metric.dimensions).to.be.an('array')
        for (const dimension of metric.dimensions) {
          expectField(dimension, 'id', 'string')
          expectField(dimension, 'displayName', 'string')
        }

        for (const key of ['from', 'to', 'granularity']) expectKey(metric.dateRange, key)
      }
    }

    const table = expectOk(await cli(['dashboard', 'metrics', String(dashboards[0].id)]))
    if (response.datablocks.length > 0) {
      for (const header of ['Datablock', 'Visualization', 'Metric ID', 'Dimensions', 'Date range']) {
        expect(table.stdout).to.include(header)
      }
    }

    expect(table.stdout).to.not.include('[object Object]')
  })

  // DashboardController answers an id outside the caller's list with not_found on id. An unmatched
  // route is not_found too, so the field and message are what show the CLI reached the endpoint.
  it('reports an unknown dashboard id with the API\'s not_found on id', async () => {
    const result = await cli(['dashboard', 'metrics', '1'])

    expectExit(result, 1)
    const text = errorText(result)
    expect(text).to.include('not_found')
    expect(text).to.include('Dashboard not found')
    expect(text).to.include('Field: id')
  })

  // The suite does not own any dashboard, so the rename is undone through withRestore().
  it('renames a dashboard, shows the API\'s refusal of a blank name, and restores it', async function () {
    if (dashboards.length === 0) skipWith(this, 'account has no dashboards')

    const {id} = dashboards[0]
    const original = dashboards[0].name

    // The API trims the name it saves and refuses a control character inside it, so such an original
    // could not be put back as it was.
    if (original.trim() === '' || original !== original.trim() || /\p{Cc}/u.test(original)) {
      skipWith(this, `dashboard ${id}: original name ${JSON.stringify(original)} could not be restored exactly through the API`)
    }

    const renamed = `${original.slice(0, MAX_NAME_LENGTH - SUFFIX.length)}${SUFFIX}`

    await withRestore(
      `dashboard.${id}.name`,
      ['dashboard', 'rename', String(id), '--name', original, '--json'],
      async () => {
        // The rename returns the dashboard in the list item shape.
        const updated = json<Dashboard>(await cli(['dashboard', 'rename', String(id), '--name', renamed, '--json']))
        expect(updated.id).to.equal(id)
        expect(updated.name).to.equal(renamed)
        expect(updated.tags).to.be.an('array')
        expect(updated.integrationKeys).to.be.an('array')

        await retryRead(async () => {
          const listed = json<Dashboard[]>(await cli(['dashboard', 'list', '--all', '--json']))
          expect(nameOf(listed, id)).to.equal(renamed)
        })

        // No client-side name rules: the CLI sends "" and prints the API's refusal on name.
        const blank = await cli(['dashboard', 'rename', String(id), '--name', ''])
        expectExit(blank, 1)
        expect(errorText(blank)).to.include('invalid_input')
        expect(errorText(blank)).to.include('Field: name')

        const table = expectOk(await cli(['dashboard', 'rename', String(id), '--name', renamed]))
        expect(table.stdout).to.include(`Name: ${renamed}`)
      },
    )

    await retryRead(async () => {
      const restored = json<Dashboard[]>(await cli(['dashboard', 'list', '--all', '--json']))
      expect(nameOf(restored, id)).to.equal(original)
    })
  })
})
