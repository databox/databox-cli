import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import {expect} from 'chai'
import {runCommand} from '@oclif/test'

import {cleanupTestConfig, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset ingest', () => {
  let tempFilePath: string

  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v1/datasets/ds-abc/data',
        response: {
          ingestionId: 'ing-1',
          status: 'accepted',
          message: 'Data ingestion queued',
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
    const {stdout} = await runCommand(['dataset', 'ingest', 'ds-abc', '--records', '[{"date":"2024-01-01","value":42}]'], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
    expect(stdout).to.contain('accepted')
  })

  it('ingests from --file', async () => {
    const {stdout} = await runCommand(['dataset', 'ingest', 'ds-abc', '--file', tempFilePath], {root: process.cwd()})
    expect(stdout).to.contain('ing-1')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'ingest', 'ds-abc', '--records', '[{"date":"2024-01-01","value":42}]', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.ingestionId).to.equal('ing-1')
    expect(parsed.status).to.equal('accepted')
  })
})
