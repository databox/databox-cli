import {expect} from 'chai'

import {
  cli, cliWithRetry, expectField, expectOk, json,
} from './helpers/cli.js'
import {withRestore} from './helpers/restore.js'

interface Profile {
  id?: number
  name?: null | string
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

  it('renders the profile as labelled output', async () => {
    const result = expectOk(await cli(['profile', 'info']))
    expect(result.stdout).to.include('Name:')
  })

  it('returns metadata options', async () => {
    const options = json<Record<string, unknown>>(await cli(['profile', 'metadata-options', '--json']))
    expect(options).to.be.an('object')
  })

  it('updates the display name and restores it', async () => {
    const original = profile.name ?? ''
    expect(original, 'profile has no name to round-trip').to.not.be.empty

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
