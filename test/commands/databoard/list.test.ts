import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {dashboardListItem, envelope, unwrapWarning} from '../dashboard/fixtures.js'

const WARNING = 'The "databoard list" command has been deprecated. Use "dashboard list" instead.'

describe('databoard list', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/dashboards',
      response: envelope({items: [dashboardListItem], pagination: {page: 0, pageSize: 25, totalItems: 1}}),
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  // /v2/databoards is deprecated in the API, so the old command reads the new route.
  it('lists dashboards from /v2/dashboards', async () => {
    const {stdout} = await runCommand(['databoard', 'list'], {root: process.cwd()})
    expect(requests().map(request => request.path)).to.deep.equal(['/v2/dashboards'])
    expect(stdout).to.include('Marketing Dashboard')
  })

  it('warns on stderr that it is deprecated', async () => {
    const {stderr} = await runCommand(['databoard', 'list'], {root: process.cwd()})
    expect(unwrapWarning(stderr)).to.include(WARNING)
  })

  it('outputs what dashboard list does with --json, the warning kept off stdout', async () => {
    const {stderr, stdout} = await runCommand(['databoard', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal([dashboardListItem])
    expect(unwrapWarning(stderr)).to.include(WARNING)
  })
})
