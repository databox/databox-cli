import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const items = [
  {
    duration: 1200, id: '3c63e510-276f-4541-9c66-8c00161fda82', initiatedAt: '2026-09-01T08:00:00+00:00', initiatedBy: {id: 31, name: 'Ada'}, status: 'success',
  },
  {
    duration: null, id: '7d2a1b40-1e7a-4f0c-9d8e-2b6c5a4f3e21', initiatedAt: '2026-09-02T08:00:00+00:00', initiatedBy: null, status: 'failed',
  },
]

describe('dataset ingestions', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{
      method: 'GET',
      path: '/v2/datasets/123/ingestions',
      response: envelope({items, pagination: {page: 0, pageSize: 25, totalItems: 2}}),
    }])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists ingestions with who started them', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123'], {root: process.cwd()})
    expect(stdout).to.contain('3c63e510-276f-4541-9c66-8c00161fda82')
    expect(stdout).to.contain('2026-09-02T08:00:00+00:00')
    expect(stdout).to.contain('failed')
    expect(stdout).to.contain('1200')
    expect(stdout).to.contain('Ada')
  })

  it('shows pagination info', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123'], {root: process.cwd()})
    expect(stdout).to.contain('Page 1 of 1 (2 total items)')
  })

  it('outputs a bare array with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestions', '123', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(items)
  })
})
