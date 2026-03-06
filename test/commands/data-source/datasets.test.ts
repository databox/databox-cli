import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('data-source datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/data-sources/42/datasets',
        response: {
          datasets: [
            {
              id: 'ds-abc',
              title: 'Linked Dataset',
              created: '2024-01-01T00:00:00Z',
            },
          ],
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists datasets for data source', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42'], {root: process.cwd()})
    expect(stdout).to.contain('Linked Dataset')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'datasets', '42', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
  })
})
