import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'

describe('dataset ingest', () => {
  let tempFilePath: string

  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/datasets/123/data',
        response: {
          data: {
            ingestionId: 'ing-1',
            message: 'Data ingestion queued',
            status: 'accepted',
          },
          requestId: 'test',
          status: 'success',
        },
      },
    ])

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'databox-cli-test-'))
    tempFilePath = path.join(tempDir, 'test-data.json')
    fs.writeFileSync(tempFilePath, JSON.stringify([{date: '2024-01-01', value: 42}]))
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
      fs.rmdirSync(path.dirname(tempFilePath))
    }
  })

  it('ingests with --records', async () => {
    const {stdout} = await runCommand(['dataset', 'ingest', '123', '--records', '[{"date":"2024-01-01","value":42}]'], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
    expect(stdout).to.contain('accepted')
    expect(lastBody('POST', '/v2/datasets/123/data')).to.deep.equal({records: [{date: '2024-01-01', value: 42}]})
  })

  it('ingests from --file', async () => {
    const {stdout} = await runCommand(['dataset', 'ingest', '123', '--file', tempFilePath], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingest', '123', '--records', '[{"date":"2024-01-01","value":42}]', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.ingestionId).to.equal('ing-1')
    expect(parsed.status).to.equal('accepted')
  })

  // DatasetService.IngestData rejects an empty records list with a 400 on `records`.
  it('rejects an empty --records array with exit 2 before calling the API', async () => {
    const {error} = await runCommand(['dataset', 'ingest', '123', '--records', '[]'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('At least one record must be provided')
    expect(requests()).to.have.length(0)
  })

  it('rejects an empty array from --file with exit 2 before calling the API', async () => {
    fs.writeFileSync(tempFilePath, '[]')
    const {error} = await runCommand(['dataset', 'ingest', '123', '--file', tempFilePath], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('At least one record must be provided')
    expect(requests()).to.have.length(0)
  })

  // Production's IngestSettings.MaxRecords is 500: the API answers 413 request_too_large past it.
  it('sends 500 records, the production limit', async () => {
    fs.writeFileSync(tempFilePath, JSON.stringify(Array.from({length: 500}, (_, i) => ({value: i}))))
    const {error} = await runCommand(['dataset', 'ingest', '123', '--file', tempFilePath], {root: process.cwd()})
    expect(error).to.equal(undefined)
    expect(requests()).to.have.length(1)
  })

  it('refuses 501 records with exit 2 before calling the API', async () => {
    fs.writeFileSync(tempFilePath, JSON.stringify(Array.from({length: 501}, (_, i) => ({value: i}))))
    const {error} = await runCommand(['dataset', 'ingest', '123', '--file', tempFilePath], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('501 records exceeds the API limit of 500 per request')
    expect(requests()).to.have.length(0)
  })

  // Production's web server refuses a body over 30,000,000 bytes with a bare 413 and no message.
  it('refuses a payload over 30,000,000 bytes with exit 2 before calling the API', async () => {
    fs.writeFileSync(tempFilePath, JSON.stringify([{value: 'x'.repeat(30_000_000)}]))
    const {error} = await runCommand(['dataset', 'ingest', '123', '--file', tempFilePath], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('over the API limit of 30 MB (30,000,000 bytes)')
    expect(requests()).to.have.length(0)
  })
})
