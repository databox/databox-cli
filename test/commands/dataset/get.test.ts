import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v2/datasets/123',
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            id: 123,
            createdAt: '2024-01-01T00:00:00Z',
            dataSourceId: 10,
            timezone: 'UTC',
            primaryKey: ['date'],
            schema: [
              {columnId: 'date', dataType: 'datetime'},
              {columnId: 'value', dataType: 'number'},
            ],
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets dataset details', async () => {
    const {stdout} = await runCommand(['dataset', 'get', '123'], {root: process.cwd()})
    expect(stdout).to.contain('123')
    expect(stdout).to.contain('10')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'get', '123', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.schema).to.be.an('array')
    expect(parsed.schema).to.have.lengthOf(2)
  })

  it('rejects non-numeric dataset ID', async () => {
    const {error} = await runCommand(['dataset', 'get', 'abc'], {root: process.cwd()})
    expect(error?.message).to.include('must be a numeric value')
  })
})
