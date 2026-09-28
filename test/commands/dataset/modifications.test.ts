import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, modification} from './fixtures.js'

describe('dataset modifications', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/datasets/123/modifications', response: envelope(modification)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  // The response is an object, not a list; table mode used to crash on it.
  it('renders one row per column, in the dataset order', async () => {
    const {error, stdout} = await runCommand(['dataset', 'modifications', '123'], {root: process.cwd()})
    expect(error).to.equal(undefined)

    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/Column.+Display Name.+Visible.+Formula.+Filter.+Type/)
    const rows = lines.slice(2)
    expect(rows).to.have.length(3)
    expect(rows[0]).to.match(/orderId\s.+no/)
    expect(rows[1]).to.include('Revenue')
    expect(rows[1]).to.include('greater_than 100 AND is_not_null')
    expect(rows[1]).to.include('currency')
    expect(rows[2]).to.include('$amount * 1.2')
  })

  it('outputs the definition whole with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'modifications', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(modification)
  })

  it('prints a CSV header and one line per column', async () => {
    const {stdout} = await runCommand(['dataset', 'modifications', '123', '--output', 'csv'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.equal('Column,Display Name,Visible,Formula,Filter,Type')
    expect(lines).to.have.length(4)
  })
})
