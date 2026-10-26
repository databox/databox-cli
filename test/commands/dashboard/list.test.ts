import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {dashboardListItem, envelope} from './fixtures.js'

describe('dashboard list', () => {
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

  it('lists dashboards with their tags and integrations', async () => {
    const {stdout} = await runCommand(['dashboard', 'list'], {root: process.cwd()})
    expect(stdout).to.include('Marketing Dashboard')
    expect(stdout).to.include('marketing')
    expect(stdout).to.include('GoogleAnalytics4')
  })

  it('sends --search in the query', async () => {
    await runCommand(['dashboard', 'list', '--search', 'market'], {root: process.cwd()})
    expect(new URLSearchParams(requests()[0].search).get('search')).to.equal('market')
  })

  // runCommand passes a quoted blank through as the empty string.
  for (const value of ['""', '"  "']) {
    it(`rejects --search ${value} with exit 2 and sends nothing`, async () => {
      const {error} = await runCommand(['dashboard', 'list', '--search', value], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain('--search cannot be empty')
      expect(requests()).to.have.length(0)
    })
  }

  it('outputs a bare array with --json, items passed through whole', async () => {
    const {stdout} = await runCommand(['dashboard', 'list', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal([dashboardListItem])
  })
})
