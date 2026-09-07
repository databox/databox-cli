import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

const INGESTION_ID = '3c63e510-276f-4541-9c66-8c00161fda82'

describe('dataset ingestion', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'GET',
        path: `/v2/datasets/123/ingestions/${INGESTION_ID}`,
        response: {
          status: 'success',
          requestId: 'test',
          data: {
            ingestionId: INGESTION_ID,
            startedAt: '2024-01-01T00:00:00Z',
            finishedAt: '2024-01-01T00:00:05Z',
            status: 'completed',
            duration: 5,
            user: {id: 31, name: 'Ada'},
            metrics: {recordsProcessed: 100},
            errors: null,
          },
        },
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets ingestion details', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', '123', INGESTION_ID], {root: process.cwd()})
    expect(stdout).to.contain(INGESTION_ID)
    expect(stdout).to.contain('completed')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', '123', INGESTION_ID, '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.metrics).to.exist
    expect(parsed.startedAt).to.equal('2024-01-01T00:00:00Z')
  })

  // The route constraint is {ingestionId:guid}; a non-GUID used to be interpolated
  // straight into the path and come back as an unactionable 404.
  it('rejects a non-UUID ingestion ID with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'ingestion', '123', 'ing-1'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('UUID')
  })

  it('rejects a non-numeric dataset ID with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'ingestion', 'abc', INGESTION_ID], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
  })
})
