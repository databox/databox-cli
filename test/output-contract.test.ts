import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from './helpers.js'

/**
 * Review S13: list tests asserted the rows but never the pagination line or the empty
 * state. Every list command renders through the same formatOutput/showPagination pair,
 * so the contract is asserted once here rather than repeated per command.
 */

const PATH = '/v2/data-sources'

function mockList(items: unknown[], pagination?: {page: number; pageSize: number; totalItems: number}): void {
  mockApi([
    {
      method: 'GET',
      path: PATH,
      response: {data: {items, pagination}, requestId: 'test', status: 'success'},
    },
  ])
}

const ROW = {
  connectionId: null,
  id: 10,
  integrationKey: 'DataboxAPI',
  name: 'A source',
  statusInfo: {status: 'active'},
  timezone: 'UTC',
}

describe('list output contract', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('prints a table and the 1-based pagination line', async () => {
    mockList([ROW], {page: 0, pageSize: 25, totalItems: 1})

    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})

    expect(stdout).to.include('A source')
    // The API pages from 0; the display is 1-based.
    expect(stdout).to.include('Page 1 of 1 (1 total items)')
  })

  it('reports the last page correctly', async () => {
    mockList([ROW], {page: 3, pageSize: 10, totalItems: 31})

    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})

    expect(stdout).to.include('Page 4 of 4 (31 total items)')
  })

  it('says so when there are no results, with no pagination line', async () => {
    mockList([], {page: 0, pageSize: 25, totalItems: 0})

    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})

    expect(stdout).to.include('No results found.')
    // "Page 1 of 0" is what this used to print.
    expect(stdout).to.not.match(/Page \d+ of/)
  })

  it('does not divide by a zero page size', async () => {
    mockList([ROW], {page: 0, pageSize: 0, totalItems: 5})

    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})

    expect(stdout).to.not.include('Infinity')
    expect(stdout).to.match(/Page \d+ of \d+/)
  })

  it('omits the pagination line under --json, and emits only JSON', async () => {
    mockList([ROW], {page: 0, pageSize: 25, totalItems: 1})

    const {stdout} = await runCommand(['data-source', 'list', '--json'], {root: process.cwd()})

    expect(() => JSON.parse(stdout)).to.not.throw()
    expect(JSON.parse(stdout)).to.be.an('array').with.lengthOf(1)
  })

  it('emits an empty JSON array for an empty list', async () => {
    mockList([], {page: 0, pageSize: 25, totalItems: 0})

    const {stdout} = await runCommand(['data-source', 'list', '--json'], {root: process.cwd()})

    expect(JSON.parse(stdout)).to.deep.equal([])
  })

  it('tolerates a response with no pagination object', async () => {
    mockList([ROW])

    const {stdout} = await runCommand(['data-source', 'list'], {root: process.cwd()})

    expect(stdout).to.include('A source')
    expect(stdout).to.not.match(/Page \d+ of/)
  })
})
