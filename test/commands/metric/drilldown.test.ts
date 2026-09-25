import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const ARGS = [
  'metric', 'drilldown',
  '--metric-id', '42|custom_query_1',
  '--source-id', '42',
  '--start-timestamp', '1704067200',
  '--end-timestamp', '1706745600',
]

/** MetricsResponse.cs MetricDrilldownResponse: rows keyed by column id, described by schema.items. */
const drilldown = {
  items: [
    {amount: 1000, calc8f3a: 'web', createdAt: '2024-01-08T12:30:00Z'},
    {amount: 250, calc8f3a: 'store', createdAt: '2024-01-09T09:00:00Z'},
  ],
  pagination: {page: 0, pageSize: 200, totalItems: 2},
  schema: {
    items: [
      {dataType: 'datetime', displayName: 'Created At', id: 'createdAt'},
      {dataType: 'number', displayName: 'Amount', id: 'amount'},
      {dataType: 'string', displayName: 'Order channel', id: 'calc8f3a'},
    ],
  },
}

describe('metric drilldown', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  describe('with rows', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{method: 'POST', path: '/v2/metrics/drilldown', response: envelope(drilldown)}])
    })

    it('renders the rows under the schema display names, in schema order', async () => {
      const {stdout} = await runCommand(ARGS, {root: process.cwd()})
      const lines = stdout.trim().split('\n')
      expect(lines[0]).to.match(/Created At.+Amount.+Order channel/)
      expect(lines[2]).to.match(/2024-01-08T12:30:00Z\s.+1000\s.+web/)
      expect(stdout).to.include('Page 1 of 1 (2 total items)')
    })

    // MetricsRequests.cs MetricDrilldownRequest: sourceId, not datasetId; dimensionIds; the filters object.
    it('sends sourceId, period, dimensionIds and filters', async () => {
      const filters = {
        groups: [{
          conditions: [{
            field: 'country', operator: 'ANY_OF', type: 'dimension', values: ['US'],
          }], logicalOperator: 'AND',
        }],
        logicalOperator: 'AND',
      }
      await runCommand([
        ...ARGS,
        '--dimension-id', 'country',
        '--dimension-id', 'calc8f3a',
        '--filters', JSON.stringify(filters),
      ], {root: process.cwd()})

      expect(lastBody('POST', '/v2/metrics/drilldown')).to.deep.equal({
        dimensionIds: ['country', 'calc8f3a'],
        filters,
        metricId: '42|custom_query_1',
        period: {endTimestamp: 1_706_745_600, startTimestamp: 1_704_067_200},
        sourceId: 42,
      })
    })

    it('omits dimensionIds and filters when not given', async () => {
      await runCommand(ARGS, {root: process.cwd()})
      expect(lastBody('POST', '/v2/metrics/drilldown')).to.not.have.any.keys('dimensionIds', 'filters', 'datasetId')
    })

    it('sends page, pageSize, sortBy and sortOrder as query parameters', async () => {
      await runCommand([...ARGS, '--page', '2', '--page-size', '500', '--sort-by', 'amount', '--sort-order', 'desc'], {root: process.cwd()})
      const {search} = requests()[0]
      const query = new URLSearchParams(search)
      expect(Object.fromEntries(query)).to.deep.equal({
        page: '2', pageSize: '500', sortBy: 'amount', sortOrder: 'desc',
      })
    })

    it('rejects a --page-size over 1000', async () => {
      const {error} = await runCommand([...ARGS, '--page-size', '1001'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.lengthOf(0)
    })

    it('rejects --sort-order without --sort-by', async () => {
      const {error} = await runCommand([...ARGS, '--sort-order', 'desc'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--sort-by')
      expect(requests()).to.have.lengthOf(0)
    })

    it('takes the dataset from the metric ID when --source-id is omitted', async () => {
      await runCommand(ARGS.filter((arg, i) => arg !== '--source-id' && ARGS[i - 1] !== '--source-id'), {root: process.cwd()})
      expect(lastBody('POST', '/v2/metrics/drilldown')).to.include({metricId: '42|custom_query_1', sourceId: 42})
    })

    it('rejects a --source-id that is not the dataset in the metric ID', async () => {
      const {error} = await runCommand(ARGS.map(arg => (arg === '42' ? '43' : arg)), {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--source-id must be the dataset in --metric-id (42)')
      expect(requests()).to.have.lengthOf(0)
    })

    it('requires --source-id when the metric ID has no dataset', async () => {
      const {error} = await runCommand([
        'metric', 'drilldown', '--metric-id', 'GoogleAnalytics4@sessions',
        '--start-timestamp', '1704067200', '--end-timestamp', '1706745600',
      ], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--source-id is required')
      expect(requests()).to.have.lengthOf(0)
    })

    it('rejects a start after the end', async () => {
      const {error} = await runCommand([
        'metric', 'drilldown', '--metric-id', '42|custom_query_1', '--source-id', '42',
        '--start-timestamp', '1706745600', '--end-timestamp', '1704067200',
      ], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.lengthOf(0)
    })

    it('outputs the whole response with --json', async () => {
      const {stdout} = await runCommand([...ARGS, '--json'], {root: process.cwd()})
      expect(JSON.parse(stdout)).to.deep.equal(drilldown)
    })

    it('uses the schema for the CSV header', async () => {
      const {stdout} = await runCommand([...ARGS, '--output', 'csv'], {root: process.cwd()})
      const lines = stdout.trim().split('\n')
      expect(lines[0]).to.equal('Created At,Amount,Order channel')
      expect(lines[1]).to.equal('2024-01-08T12:30:00Z,1000,web')
    })
  })

  describe('with --all', () => {
    const third = {amount: 75, calc8f3a: 'web', createdAt: '2024-01-10T15:00:00Z'}

    beforeEach(() => {
      setupTestConfig()
      mockApi([
        {
          method: 'POST',
          path: '/v2/metrics/drilldown',
          response: envelope({...drilldown, pagination: {page: 0, pageSize: 2, totalItems: 3}}),
          search: '?page=0&pageSize=2',
        },
        {
          method: 'POST',
          path: '/v2/metrics/drilldown',
          response: envelope({...drilldown, items: [third], pagination: {page: 1, pageSize: 2, totalItems: 3}}),
          search: '?page=1&pageSize=2',
        },
      ])
    })

    it('posts the same body for every page and varies only the page', async () => {
      const {stdout} = await runCommand([...ARGS, '--all', '--page-size', '2', '--json'], {root: process.cwd()})

      const sent = requests()
      expect(sent.map(request => request.search)).to.deep.equal(['?page=0&pageSize=2', '?page=1&pageSize=2'])
      expect(sent[1].body).to.deep.equal(sent[0].body)

      const merged = JSON.parse(stdout)
      expect(merged.items).to.deep.equal([...drilldown.items, third])
      expect(merged.schema).to.deep.equal(drilldown.schema)
    })
  })

  describe('with items: null', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        method: 'POST',
        path: '/v2/metrics/drilldown',
        response: envelope({...drilldown, items: null, pagination: {page: 0, pageSize: 200, totalItems: 0}}),
      }])
    })

    it('reports no results', async () => {
      const {error, stdout} = await runCommand(ARGS, {root: process.cwd()})
      expect(error).to.equal(undefined)
      expect(stdout).to.include('No results found.')
    })

    it('still prints the CSV header from the schema', async () => {
      const {stdout} = await runCommand([...ARGS, '--output', 'csv'], {root: process.cwd()})
      expect(stdout.trim()).to.equal('Created At,Amount,Order channel')
    })
  })
})
