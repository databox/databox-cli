import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('account datasets', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            items: [
              {
                id: 100,
                parentDataSourceId: 10,
                name: 'Dataset One',
                timezone: null,
                datasetType: 'ingestion',
                statusInfo: {status: 'active'},
              },
            ],
            pagination: {page: 0, pageSize: 25, totalItems: 1},
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('lists datasets', async () => {
    const {stdout} = await runCommand(['account', 'datasets'], {root: process.cwd()})
    expect(stdout).to.contain('Dataset One')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['account', 'datasets', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed).to.be.an('array')
    expect(parsed).to.have.lengthOf(1)
    expect(parsed[0]).to.deep.include({id: 100, parentDataSourceId: 10, name: 'Dataset One'})
  })
})
