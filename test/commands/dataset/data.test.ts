import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, schemaColumns} from './fixtures.js'

const dataResponse = {
  items: [{amount: 100, note: 'secret', orderDate: '2026-09-01'}],
  lastUpdatedAt: '2026-09-01T08:00:00+00:00',
  pagination: {page: 0, pageSize: 200, totalItems: 1},
  schema: schemaColumns,
}

describe('dataset data', () => {
  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  describe('with rows', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{method: 'GET', path: '/v2/datasets/123/data', response: envelope(dataResponse)}])
    })

    it('orders columns by the schema, headed by display name, without hidden columns', async () => {
      const {stdout} = await runCommand(['dataset', 'data', '123'], {root: process.cwd()})
      const [header] = stdout.split('\n')
      expect(header.indexOf('Order date')).to.be.lessThan(header.indexOf('Revenue'))
      expect(stdout).to.include('2026-09-01')
      expect(stdout).to.not.include('Internal note')
      expect(stdout).to.not.include('secret')
    })

    it('outputs the whole response with --json', async () => {
      const {stdout} = await runCommand(['dataset', 'data', '123', '--json'], {root: process.cwd()})
      expect(JSON.parse(stdout)).to.deep.equal(dataResponse)
    })

    it('sends sort in the query', async () => {
      await runCommand(['dataset', 'data', '123', '--sort-by', 'amount', '--sort-order', 'desc'], {root: process.cwd()})
      const params = new URLSearchParams(requests()[0].search)
      expect(params.get('sortBy')).to.equal('amount')
      expect(params.get('sortOrder')).to.equal('desc')
    })
  })

  describe('with no rows', () => {
    beforeEach(() => {
      setupTestConfig()
      mockApi([{
        method: 'GET',
        path: '/v2/datasets/123/data',
        response: envelope({...dataResponse, items: null, pagination: {page: 0, pageSize: 200, totalItems: 0}}),
      }])
    })

    it('prints a CSV header from the schema', async () => {
      const {stdout} = await runCommand(['dataset', 'data', '123', '--output', 'csv'], {root: process.cwd()})
      expect(stdout.trim()).to.equal('Order date,Revenue')
    })

    it('says so in table mode when items is null', async () => {
      const {error, stdout} = await runCommand(['dataset', 'data', '123'], {root: process.cwd()})
      expect(error).to.equal(undefined)
      expect(stdout).to.include('No results found.')
    })
  })
})
