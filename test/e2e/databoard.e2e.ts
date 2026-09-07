import {expect} from 'chai'

import {cli, expectField, expectOk, json} from './helpers/cli.js'

interface Databoard {
  id: number
  name: string
}

describe('databoard', () => {
  let databoards: Databoard[]

  before(async () => {
    databoards = json<Databoard[]>(await cli(['databoard', 'list', '--page-size', '10', '--json']))
  })

  it('lists databoards', function () {
    if (databoards.length === 0) {
      console.log('   skip: account has no databoards')
      this.skip()
    }

    expectField(databoards[0], 'id', 'number')
    expectField(databoards[0], 'name', 'string')
  })

  it('renders the list as a table', async function () {
    if (databoards.length === 0) this.skip()

    const result = expectOk(await cli(['databoard', 'list', '--page-size', '5']))
    expect(result.stdout).to.include('Name')
  })

  it('returns the metrics on a databoard', async function () {
    if (databoards.length === 0) this.skip()

    const metrics = json<unknown>(await cli(['databoard', 'metrics', String(databoards[0].id), '--json']))
    expect(metrics).to.not.equal(null)
  })
})
