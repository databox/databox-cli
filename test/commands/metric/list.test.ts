import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope, metricListItem} from './fixtures.js'

const page = {items: [metricListItem], pagination: {page: 0, pageSize: 25, totalItems: 1}}

describe('metric list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: '/v2/metrics', response: envelope(page)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('shows dimensions by display name, and drilldown support', async () => {
    const {stdout} = await runCommand(['metric', 'list'], {root: process.cwd()})
    const lines = stdout.trim().split('\n')
    expect(lines[0]).to.match(/ID.+Name.+Source ID.+Dimensions.+Drilldown.+Verified/)
    expect(lines[2]).to.match(/42\|custom_query_1\s.+Revenue\s.+42\s.+Country, Order channel\s.+yes\s.+yes/)
    expect(stdout).to.not.include('[object Object]')
    expect(stdout).to.not.include('calc_8f3a')
  })

  it('sends --source-id and --search as query parameters', async () => {
    await runCommand(['metric', 'list', '--source-id', '42', '--search', 'rev'], {root: process.cwd()})
    expect(requests()[0].search).to.equal('?sourceId=42&search=rev')
  })

  it('rejects a non-integer --source-id', async () => {
    const {error} = await runCommand(['metric', 'list', '--source-id', 'abc'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(requests()).to.have.lengthOf(0)
  })

  it('outputs the items whole as an array with --json', async () => {
    const {stdout} = await runCommand(['metric', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal([metricListItem])
  })
})
