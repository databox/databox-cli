import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectKey, expectOk, json, skipWith,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

/** AccountResponse.cs `AccountResponse`: only what these tests read. */
interface Account {
  accountType: string
  companyName: null | string
  id: number
  name: string
  settings: {
    calendar: null | string
    fiscalYearStart: {day: number; month: number} | null
  } | null
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
    for (const key of ['websiteUrl', 'address', 'taxNumber', 'billingName', 'metadata']) expectKey(account, key)
    if (account.settings) {
      for (const key of ['dateFormat', 'numberFormat', 'firstDayOfWeek', 'calendar', 'fiscalYearStart']) {
        expectKey(account.settings, key)
      }
    }
  })

  it('renders account info as a labelled table', async () => {
    const result = expectOk(await cli(['account', 'info']))
    expect(result.stdout).to.include('Account Type:')
    expect(result.stdout).to.include(account.name)
  })

  // {count, limit} per bucket, and aiCredits, which is null when the credits read failed.
  it('reports usage counts and AI credits', async () => {
    const usage = json<{aiCredits: Record<string, unknown> | null} & Record<string, {count: number; limit: null | number}>>(
      await cli(['account', 'usage', '--json']),
    )

    for (const bucket of ['users', 'dataSources', 'clients']) {
      expectField(usage, bucket, 'object')
      expect(usage[bucket].count, `${bucket}.count`).to.be.a('number').and.to.be.at.least(0)
      expectKey(usage[bucket], 'limit')
    }

    expectKey(usage, 'aiCredits')
    if (usage.aiCredits) {
      for (const key of ['used', 'limit', 'remaining', 'resetsAt']) expectKey(usage.aiCredits, key)
      expect(['ok', 'low', 'exhausted', 'unknown']).to.include(usage.aiCredits.state)
    } else {
      console.log('   note: aiCredits is null (the API could not read the credit usage)')
    }

    // Rendered as readable lines, not a JSON-encoded object.
    const table = expectOk(await cli(['account', 'usage']))
    expect(table.stdout).to.match(/Users: \d+ of /)
    expect(table.stdout).to.include('AI credits')
    expect(table.stdout).to.not.include('{"')
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

  // Sets a fiscal calendar and a fiscal year start, then puts the original back. Only run from a
  // state the restore can reproduce exactly: gregorian (upstream clears the fiscal config for it),
  // or customFiscal with a known start. A non-gregorian save reuses the stored calendar config, so
  // a weekAlignedFiscal account could lose its week pattern for good.
  it('round-trips a fiscal calendar and restores it', async function () {
    const original = json<Account>(await cli(['account', 'info', '--json'])).settings
    const calendar = original?.calendar
    const start = original?.fiscalYearStart ?? null

    const restorable = (calendar === 'gregorian' && start === null) || (calendar === 'customFiscal' && start !== null)
    if (!restorable) {
      skipWith(this, `the account's calendar (${calendar ?? 'none'}, fiscal year start ${JSON.stringify(start)}) could not be restored exactly`)
    }

    const restoreSettings: Record<string, unknown> = calendar === 'gregorian'
      ? {calendar}
      : {calendar, fiscalYearStart: start}

    // Differs from the current start, so the change is observable whatever the account had.
    const fiscalYearStart = start?.month === 4 ? {day: 1, month: 7} : {day: 1, month: 4}

    await withRestore(
      'account.settings.calendar',
      ['account', 'update', '--settings', JSON.stringify(restoreSettings), '--json'],
      async () => {
        const updated = json<Account>(await cli([
          'account', 'update', '--settings', JSON.stringify({calendar: 'customFiscal', fiscalYearStart}), '--json',
        ]))
        expect(updated.settings?.calendar).to.equal('customFiscal')
        expect(updated.settings?.fiscalYearStart).to.deep.equal(fiscalYearStart)

        const reread = json<Account>(await cli(['account', 'info', '--json']))
        expect(reread.settings?.calendar).to.equal('customFiscal')
        expect(reread.settings?.fiscalYearStart).to.deep.equal(fiscalYearStart)
      },
    )

    const restored = json<Account>(await cli(['account', 'info', '--json'])).settings
    expect(restored?.calendar).to.equal(calendar)
    expect(restored?.fiscalYearStart).to.deep.equal(start)
  })

  it('updates the account name and restores it', async function () {
    const original = account.name

    // Both the CLI and the API refuse a blank name, so a blank original could never be put back.
    if (original.trim() === '') {
      skipWith(this, 'account: original name is blank and cannot be restored through the API')
    }

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
