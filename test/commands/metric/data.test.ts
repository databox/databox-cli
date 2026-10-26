import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {METRIC_DATA_TIMEOUT_MS} from '../../../src/lib/api-client.js'
import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

/** The metric id is one path segment: its "|" is sent encoded. */
const PATH = '/v2/metrics/16%7Ccustom_query_5/data'

const RANGE = ['--from', '2026-06-01', '--to', '2026-06-30', '--granularity', 'daily']
const ARGS = ['metric', 'data', '--metric-id', '16|custom_query_5', ...RANGE]

/** MetricsResponse.cs MetricDataResult: dates in the source's timezone, a null value for an empty bucket. */
const result = {
  dataPoints: [
    {date: '2026-06-01T00:00:00+02:00', dimensions: {country: 'US'}, value: 12_500},
    {date: '2026-06-02T00:00:00+02:00', dimensions: {country: 'US'}, value: null},
    {date: '2026-06-01T00:00:00+02:00', dimensions: {country: 'UK'}, value: 800},
  ],
  metric: {id: '16|custom_query_5', name: 'Revenue', sourceId: 16},
  // MetricsResponse.cs MetricSyncInfo.
  syncInfo: {
    lastSyncedAt: '2026-09-24T08:00:00Z',
    message: 'Synced for this request; the data is current as of 2026-09-24T08:00:00Z.',
    status: 'synced',
  },
}

const SYNC_LINE = 'Sync: synced — Synced for this request; the data is current as of 2026-09-24T08:00:00Z.'

describe('metric data', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  describe('with data points', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([
        {method: 'POST', path: PATH, response: envelope(result)},
        {method: 'POST', path: '/v2/metrics/GoogleAnalytics4%40sessions/data', response: envelope(result)},
      ])
    })

    // MetricsRequests.cs LoadMetricDataV2Request: the metric id in the path, the range under dateRange.
    it('takes sourceId from the metric ID and sends the date range', async () => {
      await runCommand(ARGS, {root: process.cwd()})
      expect(requests().map(request => request.path)).to.deep.equal([PATH])
      expect(lastBody('POST', PATH)).to.deep.equal({
        dateRange: {from: '2026-06-01', granularity: 'daily', to: '2026-06-30'},
        sourceId: 16,
      })
    })

    it('sends an explicit --source-id that matches the metric ID', async () => {
      await runCommand([...ARGS, '--source-id', '16'], {root: process.cwd()})
      expect(lastBody('POST', PATH)).to.include({sourceId: 16})
    })

    it('sends --source-id for a metric ID without one, encoding the "@"', async () => {
      await runCommand(['metric', 'data', '--metric-id', 'GoogleAnalytics4@sessions', '--source-id', '42', ...RANGE], {root: process.cwd()})
      expect(lastBody('POST', '/v2/metrics/GoogleAnalytics4%40sessions/data')).to.include({sourceId: 42})
    })

    it('sends repeated --dimension-id as dimensionIds', async () => {
      await runCommand([...ARGS, '--dimension-id', 'country', '--dimension-id', 'channel'], {root: process.cwd()})
      expect(lastBody('POST', PATH)).to.deep.include({dimensionIds: ['country', 'channel']})
    })

    // MetricsRequests.cs MetricDataFilterSet: one flat group, passed through as given.
    it('sends --filters as the flat filter object', async () => {
      const filters = {
        conditions: [{
          field: 'country', operator: 'ANY_OF', type: 'dimension', values: ['US'],
        }],
        logicalOperator: 'AND',
      }
      await runCommand([...ARGS, '--filters', JSON.stringify(filters)], {root: process.cwd()})
      expect(lastBody('POST', PATH)).to.deep.include({filters})
    })

    for (const granularity of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'allTime']) {
      it(`accepts --granularity ${granularity}`, async () => {
        await runCommand([...ARGS.slice(0, -1), granularity], {root: process.cwd()})
        expect(lastBody<{dateRange: {granularity: string}}>('POST', PATH)?.dateRange.granularity).to.equal(granularity)
      })
    }

    it('rejects --granularity hourly, which the API refuses', async () => {
      const {error} = await runCommand([...ARGS.slice(0, -1), 'hourly'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(requests()).to.have.lengthOf(0)
    })

    it('allows the metric data call its own timeout', async () => {
      const original = AbortSignal.timeout
      const timeouts: number[] = []
      AbortSignal.timeout = (ms: number) => {
        timeouts.push(ms)
        return original.call(AbortSignal, ms)
      }

      try {
        await runCommand(ARGS, {root: process.cwd()})
      } finally {
        AbortSignal.timeout = original
      }

      expect(timeouts).to.deep.equal([METRIC_DATA_TIMEOUT_MS])
      // Longer than the 150 s the API waits for a sync, so its 504 arrives first.
      expect(METRIC_DATA_TIMEOUT_MS).to.be.greaterThan(150_000)
    })

    it('renders date, value and a column per dimension, then the sync line on stderr', async () => {
      const {stderr, stdout} = await runCommand(ARGS, {root: process.cwd()})
      const lines = stdout.trim().split('\n')
      expect(lines[0]).to.match(/Date\s.+Value\s.+country/)
      expect(lines[2]).to.match(/2026-06-01T00:00:00\+02:00\s.+12500\s.+US/)
      expect(lines[3]).to.match(/2026-06-02T00:00:00\+02:00\s+│\s+│ US/)
      expect(stdout).to.not.include('Sync:')
      expect(stderr).to.include(SYNC_LINE)
    })

    it('outputs the whole response with --json, and no sync line', async () => {
      const {stderr, stdout} = await runCommand([...ARGS, '--json'], {root: process.cwd()})
      expect(JSON.parse(stdout)).to.deep.equal(result)
      expect(stderr).to.not.include('Sync:')
    })

    it('prints only the rows as CSV, with the sync line on stderr', async () => {
      const {stderr, stdout} = await runCommand([...ARGS, '--output', 'csv'], {root: process.cwd()})
      expect(stdout.trim().split('\n')).to.deep.equal([
        'Date,Value,country',
        '2026-06-01T00:00:00+02:00,12500,US',
        '2026-06-02T00:00:00+02:00,,US',
        '2026-06-01T00:00:00+02:00,800,UK',
      ])
      expect(stderr).to.include(SYNC_LINE)
    })
  })

  describe('with no data points', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        method: 'POST',
        path: PATH,
        response: envelope({
          ...result,
          dataPoints: [],
          syncInfo: {
            lastSyncedAt: null, message: 'A sync is running; values may be missing or stale. Retry in a minute.', status: 'inProgress',
          },
        }),
      }])
    })

    it('reports no results, then the sync line', async () => {
      const {stderr, stdout} = await runCommand(ARGS, {root: process.cwd()})
      expect(stdout).to.include('No results found.')
      expect(stderr).to.include('Sync: inProgress — A sync is running; values may be missing or stale. Retry in a minute.')
    })
  })

  describe('input validation', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{method: 'POST', path: PATH, response: envelope(result)}])
    })

    for (const [flag, value] of [['--from', '2026-6-1'], ['--to', '30/06/2026'], ['--from', '2026-02-30']]) {
      it(`rejects ${flag} ${value}`, async () => {
        const {error} = await runCommand(ARGS.map(arg => (arg === (flag === '--from' ? '2026-06-01' : '2026-06-30') ? value : arg)), {root: process.cwd()})
        expect(error?.oclif?.exit).to.equal(2)
        expect(error?.message).to.contain(`${flag} must be a date as YYYY-MM-DD`)
        expect(requests()).to.have.lengthOf(0)
      })
    }

    it('rejects --from after --to', async () => {
      const {error} = await runCommand([
        'metric', 'data', '--metric-id', '16|custom_query_5', '--from', '2026-07-01', '--to', '2026-06-30', '--granularity', 'daily',
      ], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--from must be on or before --to')
      expect(requests()).to.have.lengthOf(0)
    })

    it('requires --source-id when the metric ID has no source before "|"', async () => {
      const {error} = await runCommand(['metric', 'data', '--metric-id', 'GoogleAnalytics4@sessions', ...RANGE], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--source-id is required')
      expect(requests()).to.have.lengthOf(0)
    })

    it('rejects a --source-id that is not the one in the metric ID', async () => {
      const {error} = await runCommand([...ARGS, '--source-id', '17'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--source-id must be the source in --metric-id (16)')
      expect(requests()).to.have.lengthOf(0)
    })
  })

  // syncInfo is null for a metric that never syncs (a constant or media metric).
  describe('with no sync state', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{method: 'POST', path: PATH, response: envelope({...result, syncInfo: null})}])
    })

    it('still prints the values, and a sync line that says the state is unknown', async () => {
      const {stderr, stdout} = await runCommand(ARGS, {root: process.cwd()})
      expect(stdout).to.include('12500')
      expect(stderr).to.include('Sync: unknown')
    })

    it('passes the null through with --json', async () => {
      const {stdout} = await runCommand([...ARGS, '--json'], {root: process.cwd()})
      expect(JSON.parse(stdout).syncInfo).to.equal(null)
    })
  })

  // A dataset metric whose dataset modification is still being applied (CustomErrorHandlingExtension: Retry-After 5).
  describe('while the dataset modification is being applied', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        headers: {'Retry-After': '5'},
        method: 'POST',
        path: PATH,
        response: {
          errors: [{
            code: 'modification_in_progress', field: '', message: "The dataset's modification is being applied. Retry in a few seconds.", type: 'request',
          }],
          requestId: 'req-409',
          status: 'error',
        },
        status: 409,
      }])
    })

    it('shows the API message and the Retry-After seconds, exit 1', async () => {
      const {error} = await runCommand(ARGS, {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(1)
      expect(error?.message).to.contain('modification_in_progress')
      expect(error?.message).to.contain('Retry after 5 s')
      expect(error?.message).to.contain('Request ID: req-409')
      expect(requests()).to.have.lengthOf(1)
    })
  })

  describe('over the rate limit', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        headers: {'Retry-After': '12'},
        method: 'POST',
        path: PATH,
        response: {
          errors: [{
            code: 'rate_limited',
            field: '',
            message: 'Rate limit exceeded: metric data allows 30 calls per account per minute. Retry after 12 seconds.',
            type: 'request',
          }],
          requestId: 'req-429',
          status: 'error',
        },
        status: 429,
      }])
    })

    it('shows the API message and the Retry-After seconds, exit 1', async () => {
      const {error} = await runCommand(ARGS, {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(1)
      expect(error?.message).to.contain('rate_limited')
      expect(error?.message).to.contain('Retry after 12 s')
      expect(error?.message).to.contain('Request ID: req-429')
    })
  })
})
