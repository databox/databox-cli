import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {
  cleanupTestConfig, lastBody, mockApi, requests, restoreApi, setupTestConfig,
} from '../../helpers.js'
import {organization} from './fixtures.js'

const updated = {...organization, name: 'UpdatedName'}

describe('organization update', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([
      {
        method: 'PATCH',
        path: '/v2/organization',
        response: {data: updated, requestId: 'test', status: 'success'},
      },
    ])
  })

  afterEach(() => {
    restoreApi()
    cleanupTestConfig()
  })

  it('updates organization name', async () => {
    const {stdout} = await runCommand(['organization', 'update', '--name', 'UpdatedName'], {root: process.cwd()})
    expect(stdout).to.contain('UpdatedName')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['organization', 'update', '--name', 'UpdatedName', '--json'], {root: process.cwd()})
    expect(JSON.parse(stdout)).to.deep.equal(updated)
  })

  it('sends the full contract surface', async () => {
    await runCommand([
      'organization', 'update',
      '--name', 'N', '--company-name', 'C', '--website-url', 'W',
      '--tax-number', 'T', '--billing-name', 'B',
      '--address', '{"city":"Boston"}',
      '--settings', '{"calendar":"gregorian"}',
      '--metadata', '{"companySize":"10"}',
    ], {root: process.cwd()})

    expect(lastBody('PATCH', '/v2/organization')).to.deep.equal({
      address: {city: 'Boston'}, billingName: 'B', companyName: 'C', metadata: {companySize: '10'}, name: 'N',
      settings: {calendar: 'gregorian'}, taxNumber: 'T', websiteUrl: 'W',
    })
  })

  it('sends a fiscal calendar with its fiscalYearStart', async () => {
    await runCommand([
      'organization', 'update', '--settings', '{"calendar":"customFiscal","fiscalYearStart":{"month":4,"day":1}}',
    ], {root: process.cwd()})

    expect(lastBody('PATCH', '/v2/organization')).to.deep.equal({
      settings: {calendar: 'customFiscal', fiscalYearStart: {day: 1, month: 4}},
    })
  })

  // runCommand refuses an empty-string flag value, so a quoted blank stands in; the check trims.
  it('rejects a blank --name with exit 2', async () => {
    const {error} = await runCommand(['organization', 'update', '--name', '" "'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
    expect(error?.message).to.contain('--name cannot be empty')
    expect(requests()).to.have.length(0)
  })

  // An empty JSON flag is parsed, not skipped, so it fails as invalid JSON rather than sending nothing.
  for (const flag of ['address', 'settings', 'metadata']) {
    it(`rejects an empty --${flag} with exit 2`, async () => {
      const {error} = await runCommand(['organization', 'update', `--${flag}`, '""'], {root: process.cwd()})
      expect(error?.oclif?.exit).to.equal(2)
      expect(error?.message).to.contain(`Invalid JSON for --${flag}`)
      expect(requests()).to.have.length(0)
    })
  }
})
