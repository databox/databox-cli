import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/accounts/123/datasets',
        response: {
          datasets: [
            {
              id: 'ds-1',
              dataSourceId: 10,
              title: 'Dataset One',
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

  it('lists datasets for account', async () => {
    const {stdout} = await runCommand(['account', 'datasets', '123'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset One')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'datasets', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({id: 'ds-1', dataSourceId: 10, title: 'Dataset One'})
  })
})
