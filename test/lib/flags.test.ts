import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {sortFlags} from '../../src/lib/flags.js'
import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../helpers.js'

function row(id: number) {
  return {
    connectionId: null, id, integrationKey: 'DataboxAPI', name: `Source ${id}`, timezone: 'UTC',
  }
}

function page(ids: number[], pageNumber: number, totalItems: number, pageSize = 100) {
  return {
    data: {items: ids.map(id => row(id)), pagination: {page: pageNumber, pageSize, totalItems}},
    requestId: 'test',
    status: 'success',
  }
}

describe('pagination flags', () => {
  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('--all keeps the filters on every page and keeps going when the API serves smaller pages', async () => {
    mockApi([
      {
        method: 'GET', path: '/v2/data-sources', response: page([1, 2], 0, 5, 2), search: '?search=src&page=0&pageSize=100',
      },
      {
        method: 'GET', path: '/v2/data-sources', response: page([3, 4], 1, 5, 2), search: '?search=src&page=1&pageSize=100',
      },
      {
        method: 'GET', path: '/v2/data-sources', response: page([5], 2, 5, 2), search: '?search=src&page=2&pageSize=100',
      },
    ])

    const {stdout} = await runCommand(['data-source', 'list', '--search', 'src', '--all', '--json'], {root: process.cwd()})

    expect(JSON.parse(stdout).map((item: {id: number}) => item.id)).to.deep.equal([1, 2, 3, 4, 5])
  })

  it('--all requests as many pages as totalItems needs and concatenates them', async () => {
    const first = Array.from({length: 100}, (_, i) => i + 1)
    const second = Array.from({length: 100}, (_, i) => i + 101)
    const third = [201, 202]
    mockApi([
      {
        method: 'GET', path: '/v2/data-sources', response: page(first, 0, 202), search: '?page=0&pageSize=100',
      },
      {
        method: 'GET', path: '/v2/data-sources', response: page(second, 1, 202), search: '?page=1&pageSize=100',
      },
      {
        method: 'GET', path: '/v2/data-sources', response: page(third, 2, 202), search: '?page=2&pageSize=100',
      },
    ])

    const {stdout} = await runCommand(['data-source', 'list', '--all', '--json'], {root: process.cwd()})

    const ids = JSON.parse(stdout).map((item: {id: number}) => item.id)
    expect(ids).to.deep.equal([...first, ...second, ...third])
    expect(requests().map(r => r.search)).to.deep.equal([
      '?page=0&pageSize=100', '?page=1&pageSize=100', '?page=2&pageSize=100',
    ])
  })

  it('--all prints no pagination footer in table mode', async () => {
    mockApi([{method: 'GET', path: '/v2/data-sources', response: page([1], 0, 1)}])

    const {stdout} = await runCommand(['data-source', 'list', '--all'], {root: process.cwd()})

    expect(stdout).to.contain('Source 1')
    expect(stdout).to.not.match(/Page \d+ of/)
  })

  it('--all stops on an empty page and warns on stderr that the result is short', async () => {
    mockApi([
      {
        method: 'GET', path: '/v2/data-sources', response: page(Array.from({length: 100}, (_, i) => i), 0, 300), search: '?page=0&pageSize=100',
      },
      {
        method: 'GET', path: '/v2/data-sources', response: page([], 1, 300), search: '?page=1&pageSize=100',
      },
    ])

    const {error, stderr, stdout} = await runCommand(['data-source', 'list', '--all', '--json'], {root: process.cwd()})

    expect(error).to.equal(undefined)
    expect(requests()).to.have.length(2)
    expect(stderr).to.contain('Fetched 100 of 300 items')
    expect(JSON.parse(stdout)).to.have.length(100)
  })

  it('--all ignores a reported pageSize that differs from the size served', async () => {
    // An endpoint echoing upstream's pagination can report 1000 while serving 100 a page.
    const ids = Array.from({length: 250}, (_, i) => i)
    mockApi([0, 1, 2].map(n => ({
      method: 'GET',
      path: '/v2/data-sources',
      response: page(ids.slice(n * 100, (n + 1) * 100), n, 250, 1000),
      search: `?page=${n}&pageSize=100`,
    })))

    const {stderr, stdout} = await runCommand(['data-source', 'list', '--all', '--json'], {root: process.cwd()})

    expect(JSON.parse(stdout)).to.have.length(250)
    expect(requests()).to.have.length(3)
    expect(stderr).to.not.contain('Fetched')
  })

  it('--all treats null items as an empty page', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: {data: {items: null, pagination: {page: 0, pageSize: 100, totalItems: 0}}, requestId: 'test', status: 'success'},
    }])

    const {error, stdout} = await runCommand(['data-source', 'list', '--all', '--json'], {root: process.cwd()})

    expect(error).to.equal(undefined)
    expect(JSON.parse(stdout)).to.deep.equal([])
  })

  it('--all returns what it got, with a warning, when the API reports no pagination', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/data-sources',
      response: {data: {items: [row(1)]}, requestId: 'test', status: 'success'},
    }])

    const {stderr, stdout} = await runCommand(['data-source', 'list', '--all', '--json'], {root: process.cwd()})

    expect(JSON.parse(stdout)).to.have.length(1)
    expect(requests()).to.have.length(1)
    expect(stderr).to.contain('reported no total')
  })

  it('rejects --all together with --page', async () => {
    const {error} = await runCommand(['data-source', 'list', '--all', '--page', '1'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--page')
  })

  it('without --all sends page and pageSize as given', async () => {
    mockApi([{method: 'GET', path: '/v2/data-sources', response: page([1], 2, 30)}])

    await runCommand(['data-source', 'list', '--page', '2', '--page-size', '10'], {root: process.cwd()})

    expect(requests()[0].search).to.equal('?page=2&pageSize=10')
  })

  it('caps --page-size at 100 on list endpoints', async () => {
    const {error} = await runCommand(['data-source', 'list', '--page-size', '101'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
  })

  it('allows --page-size up to 1000 on dataset data', async () => {
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/1/data',
      response: {data: {items: [], pagination: {page: 0, pageSize: 1000, totalItems: 0}}, requestId: 'test', status: 'success'},
    }])

    const allowed = await runCommand(['dataset', 'data', '1', '--page-size', '1000'], {root: process.cwd()})
    const rejected = await runCommand(['dataset', 'data', '1', '--page-size', '1001'], {root: process.cwd()})

    expect(allowed.error).to.equal(undefined)
    expect(rejected.error?.oclif?.exit).to.equal(2)
  })
})

describe('sortFlags', () => {
  it('restricts --sort-by to the options given', () => {
    expect(sortFlags(['name', 'createdAt'])['sort-by'].options).to.deep.equal(['name', 'createdAt'])
  })

  it('leaves --sort-by free without options', () => {
    expect(sortFlags()['sort-by'].options).to.equal(undefined)
  })
})

describe('--idempotency-key', () => {
  const KEY = '3f2b8c4e-1d2a-4b5c-9e8f-0a1b2c3d4e5f'

  beforeEach(() => {
    setupTestConfig()
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('is sent as the Idempotency-Key header', async () => {
    mockApi([{
      method: 'POST',
      path: '/v2/accounts',
      response: {data: {id: 1, name: 'Acme'}, requestId: 'test', status: 'success'},
    }])

    await runCommand(['account', 'create', '--name', 'Acme', '--idempotency-key', KEY], {root: process.cwd()})

    expect(requests()[0].headers['Idempotency-Key']).to.equal(KEY)
  })

  it('sends no header without the flag', async () => {
    mockApi([{
      method: 'POST',
      path: '/v2/accounts',
      response: {data: {id: 1, name: 'Acme'}, requestId: 'test', status: 'success'},
    }])

    await runCommand(['account', 'create', '--name', 'Acme'], {root: process.cwd()})

    expect(requests()[0].headers).to.not.have.property('Idempotency-Key')
  })

  // Exactly the routes ingestion-api marks [IdempotencyFilter]; a command outside this list
  // must not offer the flag, since the API would silently ignore it.
  const idempotent: Array<{argv: string[]; method: string; path: string}> = [
    {argv: ['account', 'create', '--name', 'n'], method: 'POST', path: '/v2/accounts'},
    {argv: ['data-source', 'create', '--name', 'n'], method: 'POST', path: '/v2/data-sources'},
    {argv: ['data-source', 'purge', '5', '--force'], method: 'POST', path: '/v2/data-sources/5/purge'},
    {
      argv: ['dataset', 'create', '--name', 'n', '--data-source-id', '1', '--schema', '[]'],
      method: 'POST',
      path: '/v2/datasets',
    },
    {argv: ['dataset', 'duplicate', '5'], method: 'POST', path: '/v2/datasets/5/duplicate'},
    {argv: ['dataset', 'ingest', '5', '--records', '[{"a":1}]'], method: 'POST', path: '/v2/datasets/5/data'},
    {argv: ['dataset', 'purge', '5', '--force'], method: 'POST', path: '/v2/datasets/5/purge'},
    {argv: ['dataset', 'update-modification', '5', '--data', '{}'], method: 'PUT', path: '/v2/datasets/5/modifications'},
    {
      argv: ['metric', 'create', '--name', 'n', '--dataset-id', '1', '--date', '{"id":"d"}', '--measure', '{"id":"m"}'],
      method: 'POST',
      path: '/v2/metrics',
    },
    {argv: ['user', 'invite', '--email', 'a@b.test', '--role', 'user'], method: 'POST', path: '/v2/users'},
  ]

  for (const {argv, method, path} of idempotent) {
    it(`${argv.slice(0, 2).join(' ')} sends it`, async () => {
      mockApi([{method, path, response: {data: {}, requestId: 'test', status: 'success'}}])

      await runCommand([...argv, '--idempotency-key', KEY], {root: process.cwd()})

      const sent = requests().find(r => r.method === method && r.path === path)
      expect(sent?.headers['Idempotency-Key']).to.equal(KEY)
    })
  }

  it('rejects a key that is not a UUID with exit 2, before any request', async () => {
    mockApi([])

    const {error} = await runCommand(['dataset', 'purge', '5', '--force', '--idempotency-key', 'not-a-uuid'], {root: process.cwd()})

    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--idempotency-key must be a UUID')
    expect(requests()).to.have.length(0)
  })

  it('is not offered by a command whose route is not idempotent', async () => {
    const {error} = await runCommand(['account', 'update', '1', '--name', 'n', '--idempotency-key', KEY], {root: process.cwd()})

    expect(error?.message).to.contain('Nonexistent flag')
  })
})
