import {expect} from 'chai'

import {cli, expectExit, expectOk, json} from './helpers/cli.js'
import {getConfig} from './helpers/env.js'

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
    const result = await cli(['auth', 'validate'], {env: {DATABOX_API_KEY: 'pak_00000000-0000-0000-0000-000000000000'}})

    expectExit(result, 1)
    expect(result.stderr).to.not.be.empty
  })

  it('exits 1 with a login hint when no credentials are configured', async () => {
    const result = await cli(['account', 'info'], {withoutCredentials: true})

    expectExit(result, 1)
    expect(result.stderr).to.include('databox auth login')
  })

  it('never echoes the API key', async () => {
    const {apiKey} = getConfig().environment

    for (const argv of [['auth', 'validate'], ['auth', 'validate', '--json'], ['account', 'info']]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await cli(argv)
      expect(result.stdout, `stdout of "${argv.join(' ')}"`).to.not.include(apiKey)
      expect(result.stderr, `stderr of "${argv.join(' ')}"`).to.not.include(apiKey)
    }
  })
})
