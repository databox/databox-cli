import {runCommand} from '@oclif/test'
import {expect} from 'chai'

import {cleanupTestConfig, lastBody, mockApi, restoreApi, setupTestConfig} from '../../helpers.js'

describe('dataset set-metadata', () => {
  beforeEach(() => {
    setupTestConfig()
    mockApi([{method: 'PATCH', path: '/v2/datasets/123/metadata', response: {status: 'success', requestId: 'test', data: {description: 'Updated'}}}])
  })

  afterEach(() => { restoreApi(); cleanupTestConfig() })

  it('updates metadata', async () => {
    const {stdout} = await runCommand(['dataset', 'set-metadata', '123', '--description', 'Updated'], {root: process.cwd()})
    expect(stdout).to.include('Updated')
  })

  it('outputs JSON with --json', async () => {
    const {stdout} = await runCommand(['dataset', 'set-metadata', '123', '--description', 'Updated', '--json'], {root: process.cwd()})
    const parsed = JSON.parse(stdout)
    expect(parsed.description).to.equal('Updated')
  })

  // The metadata contract is {description, synonyms, defaultTimeDimension} — there is
  // no `tags` field, which is what the old --tags flag sent.
  it('sends synonyms as a parsed array', async () => {
    await runCommand(['dataset', 'set-metadata', '123', '--synonyms', '["revenue","sales"]'], {root: process.cwd()})
    expect(lastBody('PATCH', '/v2/datasets/123/metadata')).to.deep.equal({synonyms: ['revenue', 'sales']})
  })

  it('rejects malformed JSON in --synonyms with exit 2', async () => {
    const {error} = await runCommand(['dataset', 'set-metadata', '123', '--synonyms', '[oops'], {root: process.cwd()})
    expect(error?.oclif?.exit).to.equal(2)
  })
})
