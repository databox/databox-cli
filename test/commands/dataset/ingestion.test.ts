import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, mockApi, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from './fixtures.js'

const INGESTION_ID = '3c63e510-276f-4541-9c66-8c00161fda82'

const detail = {
  duration: 1200,
  errors: [{
    code: 'invalid_value', field: 'amount', message: 'Not a number', record: {amount: 'x'},
  }],
  id: INGESTION_ID,
  initiatedAt: '2026-09-01T08:00:00+00:00',
  initiatedBy: {id: 31, name: 'Ada'},
  status: 'success',
  summary: {
    dataset: {columnCount: 3, rowCount: 1500, size: 204_800},
    ingestion: {
      appendedRecordCount: 9, overwrittenRecordCount: 0, receivedRecordCount: 10, rejectedRecordCount: 1,
    },
  },
}

describe('dataset ingestion', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'GET', path: `/v2/datasets/123/ingestions/${INGESTION_ID}`, response: envelope(detail)}])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('gets ingestion details', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', '123', INGESTION_ID], {root: process.cwd()})
    expect(stdout).to.contain(INGESTION_ID)
    expect(stdout).to.contain('success')
    expect(stdout).to.contain('rejectedRecordCount')
  })

  it('outputs the detail whole with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingestion', '123', INGESTION_ID, '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(detail)
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
