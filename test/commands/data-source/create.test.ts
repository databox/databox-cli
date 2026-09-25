import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {envelope} from '../dataset/fixtures.js'
import {dataSourceDetail} from './fixtures.js'

const created = {
  ...dataSourceDetail,
  connectionId: null,
  id: 99,
  integrationKey: 'Datadoo',
  lastActivityAt: null,
  name: 'NewSource',
  statusInfo: {
    description: null, errorType: null, reason: null, status: 'active', statusCode: 'active', userAction: null,
  },
}

describe('data-source create', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'POST',
        path: '/v2/data-sources',
        response: envelope(created),
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('creates a data source', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--name', 'NewSource'], {root: process.cwd()})
    expect(stdout).to.contain('NewSource')
    expect(stdout).to.contain('99')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['data-source', 'create', '--name', 'NewSource', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(created)
  })

  it('sends name, timezone and integrationKey', async () => {
    await runCommand([
      'data-source', 'create', '--name', 'NewSource', '--timezone', 'Europe/London', '--integration-key', 'Datadoo',
    ], {root: process.cwd()})
    expect(lastBody('POST', '/v2/data-sources')).to.deep.equal({integrationKey: 'Datadoo', name: 'NewSource', timezone: 'Europe/London'})
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'create', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })

  // The empty string itself is covered in test/e2e/data-source.e2e.ts.
  it('rejects a blank --integration-key with exit 2', async () => {
    const {error} = await runCommand(['data-source', 'create', '--name', 'NewSource', '--integration-key', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--integration-key cannot be empty')
    expect(requests()).to.have.length(0)
  })
})
