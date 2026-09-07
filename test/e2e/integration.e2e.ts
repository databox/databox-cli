import {expect} from 'chai'

import {cli, cliWithRetry, expectField, expectOk, json} from './helpers/cli.js'

interface Integration {
  id: number
  key: string
  name: string
}

describe('integration', () => {
  let integrations: Integration[]

  before(async () => {
    integrations = json<Integration[]>(await cliWithRetry(['integration', 'list', '--page-size', '20', '--json']))
  })

  it('lists integrations', () => {
    expect(integrations).to.be.an('array').that.is.not.empty
    expectField(integrations[0], 'id', 'number')
    expectField(integrations[0], 'key', 'string')
    expectField(integrations[0], 'name', 'string')
  })

  it('renders the catalog as a table', async () => {
    const result = expectOk(await cli(['integration', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Name')
  })

  it('filters by search term', async () => {
    const term = integrations[0].name.slice(0, 4)
    const filtered = json<Integration[]>(await cli(['integration', 'list', '--search', term, '--json']))

    expect(filtered).to.be.an('array')
    for (const integration of filtered) {
      expect(`${integration.name} ${integration.key}`.toLowerCase()).to.include(term.toLowerCase())
    }
  })

  it('returns a single integration by id', async () => {
    const integration = json<Record<string, unknown>>(
      await cli(['integration', 'get', String(integrations[0].id), '--json']),
    )

    expect(integration).to.be.an('object')
    expectField(integration, 'id', 'number')
  })
})
