import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset get', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: '/v1/datasets/ds-abc',
        response: {
          id: 'ds-abc',
          created: '2024-01-01T00:00:00Z',
          dataSourceId: 10,
          timezone: 'UTC',
          primaryKeys: ['date'],
          schema: [
            {name: 'date', dataType: 'datetime'},
            {name: 'value', dataType: 'number'},
          ],
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets dataset details', async () => {
    const {stdout} = await runCommand(['dataset', 'get', 'ds-abc'], {root: process.cwd()})
    expect(stdout).to.contain('ds-abc')
    expect(stdout).to.contain('10')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'get', 'ds-abc', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.schema).to.be.an('array')
    expect(parsed.schema).to.have.lengthOf(2)
  })
})
