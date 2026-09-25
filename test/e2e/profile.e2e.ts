import {expect} from 'chai'

import {
  cli, cliWithRetry, errorText, expectExit, expectField, expectKey, expectOk, json, skipWith,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

interface Profile {
  account?: {id: number; name: string} | null
  id?: number
  name?: null | string
  organization?: {id: number; name: string}
  timezone?: null | string
}

describe('profile', () => {
  let profile: Profile

  before(async () => {
    profile = json<Profile>(await cliWithRetry(['profile', 'info', '--json']))
  })

  it('returns the current profile', () => {
    expect(profile).to.be.an('object')
    expectField(profile, 'name', 'string')
  })

  // organization is always set; account is the user's home account, null at the organization level.
  it('returns the organization and the account', () => {
    expectField(profile, 'organization', 'object')
    expectField(profile.organization!, 'id', 'number')
    expectField(profile.organization!, 'name', 'string')
    expectKey(profile, 'account')
    expect(profile).to.not.have.property('accountId')
    expect(profile).to.not.have.property('accountType')
    if (profile.account) {
      expectField(profile.account, 'id', 'number')
      expectField(profile.account, 'name', 'string')
    }
  })

  it('renders the profile as labelled output', async () => {
    const result = expectOk(await cli(['profile', 'info']))
    expect(result.stdout).to.include('Name:')
    expect(result.stdout).to.include(`Organization: ${profile.organization!.name} (${profile.organization!.id})`)
    expect(result.stdout).to.match(/^Account: /m)
  })

  it('returns metadata options', async () => {
    const options = json<Record<string, unknown>>(await cli(['profile', 'metadata-options', '--json']))
    expect(options).to.be.an('object')
  })

  // The API answers a blank name with a 400; the CLI now catches it before the request, so
  // nothing is sent and the profile is never touched.
  it('rejects an empty --name with exit 2 before calling the API', async () => {
    const result = await cli(['profile', 'update', '--name', ''])

    expectExit(result, 2)
    expect(errorText(result)).to.include('--name cannot be empty')
  })

  it('updates the display name and restores it', async function () {
    const original = profile.name ?? ''

    // Both the CLI and the API refuse a blank name, so a blank original could never be put back.
    if (original.trim() === '') {
      skipWith(this, 'profile: original name is blank and cannot be restored through the API')
    }

    const renamed = `${original} (e2e)`

    await withRestore('profile.name', ['profile', 'update', '--name', original, '--json'], async () => {
      expectOk(await cli(['profile', 'update', '--name', renamed, '--json']))

      const reread = json<Profile>(await cli(['profile', 'info', '--json']))
      expect(reread.name).to.equal(renamed)
    })

    const restored = json<Profile>(await cli(['profile', 'info', '--json']))
    expect(restored.name).to.equal(original)
  })
})
