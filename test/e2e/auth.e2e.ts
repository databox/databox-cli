import {expect} from 'chai'
import {randomUUID} from 'node:crypto'

import {
  cli, expectExit, expectNoKey, expectOk, json,
} from './helpers/cli.js'

describe('auth', () => {
  it('validates the configured API key', async () => {
    const result = expectOk(await cli(['auth', 'validate']))
    expect(result.stdout).to.include('API key is valid.')
  })

  it('validates with --json', async () => {
    const payload = json(await cli(['auth', 'validate', '--json']))
    expect(payload).to.not.equal(null)
  })

  it('rejects an invalid API key with exit 1', async () => {
    // Well-formed but unissued — generated, so no key-shaped literal lives in the repo.
    const result = await cli(['auth', 'validate'], {env: {DATABOX_API_KEY: `pak_${randomUUID()}`}})

    expectExit(result, 1)
    expect(result.stderr).to.not.be.empty
  })

  it('exits 1 with a login hint when no credentials are configured', async () => {
    const result = await cli(['organization', 'info'], {withoutCredentials: true})

    expectExit(result, 1)
    expect(result.stderr).to.include('databox auth login')
  })

  it('never echoes the API key', async () => {
    for (const argv of [['auth', 'validate'], ['auth', 'validate', '--json'], ['organization', 'info']]) {
      // eslint-disable-next-line no-await-in-loop
      expectNoKey(await cli(argv))
    }
  })
})
