import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectKey, expectOk, json,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

interface Account {
  accountType: string
  companyName: null | string
  id: number
  name: string
}

describe('account', () => {
  let account: Account

  before(async () => {
    account = json<Account>(await cliWithRetry(['account', 'info', '--json']))
  })

  it('returns the account with its documented fields', () => {
    expectField(account, 'id', 'number')
    expectField(account, 'name', 'string')
    expectField(account, 'accountType', 'string')
    expectKey(account, 'companyName')
    expectKey(account, 'settings')
    expectKey(account, 'managedBy')
  })

  it('renders account info as a labelled table', async () => {
    const result = expectOk(await cli(['account', 'info']))
    expect(result.stdout).to.include('Account Type:')
    expect(result.stdout).to.include(account.name)
  })

  // The API returns {count, limit} per bucket, plus a `clients` bucket. Note that
  // src/commands/account/usage.ts declares {current, limit} and omits `clients` —
  // the interface is stale, though formatSingle prints whatever it is given, so
  // there is no user-visible symptom. Asserted here against the real contract.
  it('reports usage counts', async () => {
    const usage = json<Record<string, {count: number; limit: null | number}>>(await cli(['account', 'usage', '--json']))

    for (const bucket of ['users', 'dataSources', 'clients']) {
      expectField(usage, bucket, 'object')
      expect(usage[bucket].count, `${bucket}.count`).to.be.a('number').and.to.be.at.least(0)
      expectKey(usage[bucket], 'limit')
    }
  })

  it('lists timezones', async () => {
    const timezones = json<Array<{offset: string; timezone: string}>>(await cli(['account', 'timezones', '--json']))

    expect(timezones).to.be.an('array').that.is.not.empty
    expectField(timezones[0], 'timezone', 'string')
  })

  it('lists countries', async () => {
    const countries = json<Array<{code: string; name: string}>>(await cli(['account', 'countries', '--json']))

    expect(countries).to.be.an('array').that.is.not.empty
    expectField(countries[0], 'code', 'string')
    expectField(countries[0], 'name', 'string')
  })

  it('returns metadata options', async () => {
    const options = json<Record<string, unknown>>(await cli(['account', 'metadata-options', '--json']))
    expect(options).to.be.an('object')
  })

  // `account data-sources` / `account datasets` were v1 spellings of `data-source list`
  // and `dataset list`; removed in the v2-only CLI. Pinned so they do not creep back.
  it('no longer has the v1 account listing twins', async () => {
    for (const argv of [['account', 'data-sources'], ['account', 'datasets']]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await cli(argv)
      expect(result.code, `"databox ${argv.join(' ')}" should not exist`).to.not.equal(0)
    }
  })

  // An empty string is a real value — it clears a nullable field. A truthiness
  // guard would drop it, making the field impossible to unset. Asserted here
  // rather than in the unit suite: @oclif/test's runCommand refuses an
  // empty-string flag value, while the real binary accepts it.
  it('clears a nullable field when given an empty string', async () => {
    const original = json<{websiteUrl: null | string}>(await cli(['account', 'info', '--json'])).websiteUrl

    await withRestore(
      'account.websiteUrl',
      ['account', 'update', '--website-url', original ?? '', '--json'],
      async () => {
        expectOk(await cli(['account', 'update', '--website-url', 'https://cli-e2e.invalid', '--json']))
        expect(json<{websiteUrl: string}>(await cli(['account', 'info', '--json'])).websiteUrl).to.equal(
          'https://cli-e2e.invalid',
        )

        expectOk(await cli(['account', 'update', '--website-url', '', '--json']))
        expect(json<{websiteUrl: string}>(await cli(['account', 'info', '--json'])).websiteUrl).to.equal('')
      },
    )
  })

  it('rejects an update with no fields', async () => {
    const result = await cli(['account', 'update'])

    expect(result.code).to.equal(1)
    expect(result.stderr).to.include('at least one field')
  })

  it('updates the account name and restores it', async () => {
    const original = account.name
    const renamed = `${original} (e2e)`

    await withRestore('account.name', ['account', 'update', '--name', original, '--json'], async () => {
      const updated = json<Account>(await cli(['account', 'update', '--name', renamed, '--json']))
      expect(updated.name).to.equal(renamed)

      const reread = json<Account>(await cli(['account', 'info', '--json']))
      expect(reread.name).to.equal(renamed)
    })

    const restored = json<Account>(await cli(['account', 'info', '--json']))
    expect(restored.name).to.equal(original)
  })
})
